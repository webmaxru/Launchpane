use crate::error::AppError;
use std::path::PathBuf;

pub fn home_dir() -> Result<PathBuf, AppError> {
    #[cfg(feature = "app-store")]
    {
        // App Sandbox rewrites HOME to its container, not the account's launchd directories.
        account_home(unsafe { libc::geteuid() })
    }
    #[cfg(not(feature = "app-store"))]
    {
        dirs::home_dir().ok_or_else(|| {
            AppError::Launchctl("Could not determine the user's home directory.".into())
        })
    }
}

#[cfg(any(feature = "app-store", test))]
fn account_home(uid: libc::uid_t) -> Result<PathBuf, AppError> {
    use std::ffi::{CStr, OsString};
    use std::os::unix::ffi::OsStringExt;

    let mut size = 8192;
    loop {
        let mut buffer = vec![0u8; size];
        let mut record = std::mem::MaybeUninit::<libc::passwd>::uninit();
        let mut result = std::ptr::null_mut();
        // The record and backing buffer remain alive while copying the returned C string.
        let code = unsafe {
            libc::getpwuid_r(
                uid,
                record.as_mut_ptr(),
                buffer.as_mut_ptr().cast(),
                buffer.len(),
                &mut result,
            )
        };
        if code == libc::ERANGE && size < 1_048_576 {
            size *= 2;
            continue;
        }
        if code != 0 {
            return Err(std::io::Error::from_raw_os_error(code).into());
        }
        if result.is_null() {
            return Err(AppError::Launchctl(format!(
                "No home directory for account UID {uid}."
            )));
        }
        // A successful getpwuid_r result owns a NUL-terminated pw_dir in buffer.
        let directory = unsafe { (*result).pw_dir };
        if directory.is_null() {
            return Err(AppError::Launchctl(format!(
                "Account UID {uid} has no home directory."
            )));
        }
        let path = PathBuf::from(OsString::from_vec(
            unsafe { CStr::from_ptr(directory) }.to_bytes().to_vec(),
        ));
        if !path.is_absolute() {
            return Err(AppError::Launchctl(format!(
                "Account UID {uid} has an invalid home directory."
            )));
        }
        return Ok(path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_home_is_not_a_sandbox_container() {
        let home = account_home(unsafe { libc::geteuid() }).unwrap();
        assert!(home.is_absolute());
        assert!(!home.to_string_lossy().contains("/Library/Containers/"));
        #[cfg(feature = "app-store")]
        assert_eq!(home_dir().unwrap(), home);
    }

    #[test]
    fn unknown_account_is_an_explicit_error() {
        assert!(account_home(libc::uid_t::MAX).is_err());
    }
}
