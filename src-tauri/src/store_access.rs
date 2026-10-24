use crate::error::AppError;
#[cfg(any(feature = "app-store", test))]
use std::path::{Path, PathBuf};
#[cfg(feature = "app-store")]
use std::sync::{Mutex, MutexGuard};

#[cfg(feature = "app-store")]
use objc2::rc::Retained;
#[cfg(feature = "app-store")]
use objc2_foundation::NSURL;

#[cfg(feature = "app-store")]
const BOOKMARK_DIRECTORY: &str = "com.webmaxru.launchpane";
#[cfg(any(feature = "app-store", test))]
const BOOKMARK_FILE: &str = "folder-access.plist";
#[cfg(any(feature = "app-store", test))]
const BOOKMARKS_KEY: &str = "bookmarks";

/// A folder the user chose in the open panel. Persisting its app-scoped security-scoped
/// bookmark lets the sandbox restore exactly that grant after a relaunch.
#[cfg(feature = "app-store")]
struct Grant {
    path: PathBuf,
    bookmark: Option<Vec<u8>>,
    url: Retained<NSURL>,
    // Restored grants hold a started security scope that must be balanced when dropped.
    scoped: bool,
}

#[cfg(feature = "app-store")]
impl Drop for Grant {
    fn drop(&mut self) {
        if self.scoped {
            unsafe { self.url.stopAccessingSecurityScopedResource() };
        }
    }
}

#[cfg(feature = "app-store")]
struct State {
    restored: bool,
    grants: Vec<Grant>,
}

#[cfg(feature = "app-store")]
static STATE: Mutex<State> = Mutex::new(State {
    restored: false,
    grants: Vec::new(),
});

#[cfg(feature = "app-store")]
fn lock_state() -> Result<MutexGuard<'static, State>, AppError> {
    STATE.lock().map_err(|_| {
        AppError::Message("Could not read folder permissions. Restart Launchpane.".into())
    })
}

#[cfg(feature = "app-store")]
fn bookmark_file() -> Result<PathBuf, AppError> {
    // Inside the sandbox container, HOME is the container, so this file is app-private.
    let base = dirs::data_dir().ok_or_else(|| {
        AppError::Message("Could not locate Launchpane's application data folder.".into())
    })?;
    Ok(base.join(BOOKMARK_DIRECTORY).join(BOOKMARK_FILE))
}

#[cfg(any(feature = "app-store", test))]
fn load_bookmarks(file: &Path) -> Vec<Vec<u8>> {
    // An unreadable or corrupt file only means previously saved folders must be chosen again.
    let Ok(plist::Value::Dictionary(root)) = plist::Value::from_file(file) else {
        return Vec::new();
    };
    let Some(plist::Value::Array(items)) = root.get(BOOKMARKS_KEY) else {
        return Vec::new();
    };
    items
        .iter()
        .filter_map(|item| match item {
            plist::Value::Data(data) => Some(data.clone()),
            _ => None,
        })
        .collect()
}

#[cfg(any(feature = "app-store", test))]
fn save_bookmarks(file: &Path, bookmarks: &[&[u8]]) -> Result<(), AppError> {
    if bookmarks.is_empty() {
        return match std::fs::remove_file(file) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error.into()),
            _ => Ok(()),
        };
    }
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut root = plist::Dictionary::new();
    root.insert(
        BOOKMARKS_KEY.into(),
        plist::Value::Array(
            bookmarks
                .iter()
                .map(|data| plist::Value::Data(data.to_vec()))
                .collect(),
        ),
    );
    let temporary = file.with_extension("plist.tmp");
    plist::Value::Dictionary(root)
        .to_file_xml(&temporary)
        .map_err(|error| AppError::Plist(error.to_string()))?;
    std::fs::rename(&temporary, file)?;
    Ok(())
}

#[cfg(feature = "app-store")]
fn describe(error: &objc2_foundation::NSError) -> AppError {
    AppError::Message(error.localizedDescription().to_string())
}

#[cfg(feature = "app-store")]
fn url_path(url: &NSURL) -> Result<PathBuf, AppError> {
    let path = url.path().ok_or_else(|| {
        AppError::Message("The selected folder has no local filesystem path.".into())
    })?;
    Ok(PathBuf::from(path.to_string()))
}

#[cfg(feature = "app-store")]
fn create_bookmark(url: &NSURL) -> Result<Vec<u8>, AppError> {
    use objc2_foundation::NSURLBookmarkCreationOptions;

    let data = url
        .bookmarkDataWithOptions_includingResourceValuesForKeys_relativeToURL_error(
            NSURLBookmarkCreationOptions::WithSecurityScope,
            None,
            None,
        )
        .map_err(|error| describe(&error))?;
    Ok(data.to_vec())
}

/// Resolves a saved bookmark and starts its security scope. The returned grant stops the
/// scope when dropped. The flag reports that macOS asked for the bookmark to be recreated.
#[cfg(feature = "app-store")]
fn resolve_bookmark(bookmark: &[u8]) -> Result<(Grant, bool), AppError> {
    use objc2::runtime::Bool;
    use objc2_foundation::{NSData, NSURLBookmarkResolutionOptions};

    let data = NSData::with_bytes(bookmark);
    let mut stale = Bool::NO;
    // The out pointer refers to a local that outlives the call.
    let url = unsafe {
        NSURL::URLByResolvingBookmarkData_options_relativeToURL_bookmarkDataIsStale_error(
            &data,
            NSURLBookmarkResolutionOptions::WithSecurityScope
                | NSURLBookmarkResolutionOptions::WithoutUI
                | NSURLBookmarkResolutionOptions::WithoutMounting
                | NSURLBookmarkResolutionOptions::WithoutImplicitStartAccessing,
            None,
            &mut stale,
        )
    }
    .map_err(|error| describe(&error))?;
    let path = url_path(&url)?;
    if !unsafe { url.startAccessingSecurityScopedResource() } {
        return Err(AppError::Message(format!(
            "macOS did not restore access to {}.",
            path.display()
        )));
    }
    let grant = Grant {
        path,
        bookmark: Some(bookmark.to_vec()),
        url,
        scoped: true,
    };
    // Dropping the grant on failure balances the scope that was just started.
    std::fs::read_dir(&grant.path)?;
    Ok((grant, stale.as_bool()))
}

/// Restores every saved grant that macOS still honours. The flag reports that the saved
/// list no longer matches the file and must be written back.
#[cfg(feature = "app-store")]
fn restore_grants(file: &Path) -> (Vec<Grant>, bool) {
    let mut grants: Vec<Grant> = Vec::new();
    let mut changed = false;
    for bookmark in load_bookmarks(file) {
        let Ok((mut grant, stale)) = resolve_bookmark(&bookmark) else {
            changed = true;
            continue;
        };
        if grants.iter().any(|existing| existing.path == grant.path) {
            changed = true;
            continue;
        }
        if stale && let Ok(fresh) = create_bookmark(&grant.url) {
            grant.bookmark = Some(fresh);
            changed = true;
        }
        grants.push(grant);
    }
    (grants, changed)
}

#[cfg(feature = "app-store")]
fn persist(file: &Path, grants: &[Grant]) -> Result<(), AppError> {
    let bookmarks: Vec<&[u8]> = grants
        .iter()
        .filter_map(|grant| grant.bookmark.as_deref())
        .collect();
    save_bookmarks(file, &bookmarks)
}

#[cfg(feature = "app-store")]
fn restore_once(state: &mut State) -> Result<(), AppError> {
    if state.restored {
        return Ok(());
    }
    let file = bookmark_file()?;
    let (grants, changed) = restore_grants(&file);
    state.grants = grants;
    state.restored = true;
    if changed {
        persist(&file, &state.grants)?;
    }
    Ok(())
}

#[cfg(feature = "app-store")]
pub fn selected_folders() -> Result<Vec<PathBuf>, AppError> {
    let mut state = lock_state()?;
    restore_once(&mut state)?;
    Ok(state
        .grants
        .iter()
        .map(|grant| grant.path.clone())
        .collect())
}

#[cfg(any(feature = "app-store", test))]
pub fn includes_folder(selected: &[PathBuf], path: &Path) -> bool {
    selected.iter().any(|folder| path.starts_with(folder))
}

#[cfg(any(feature = "app-store", test))]
fn display_path(home: &Path, path: &Path) -> String {
    match path.strip_prefix(home) {
        Ok(relative) if relative.as_os_str().is_empty() => "~".into(),
        Ok(relative) => format!("~/{}", relative.display()),
        Err(_) => path.display().to_string(),
    }
}

// Synchronous Tauri commands run on the main thread, as required by NSOpenPanel.
#[tauri::command]
#[cfg(feature = "app-store")]
pub fn choose_access_folders() -> Result<bool, AppError> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSModalResponseOK, NSOpenPanel};
    use objc2_foundation::NSString;

    let main_thread = MainThreadMarker::new()
        .ok_or_else(|| AppError::Message("Folder selection requires the main thread.".into()))?;
    let panel = NSOpenPanel::openPanel(main_thread);
    panel.setCanChooseDirectories(true);
    panel.setCanChooseFiles(false);
    panel.setAllowsMultipleSelection(true);
    let agents = crate::user_paths::home_dir()?.join("Library/LaunchAgents");
    panel.setDirectoryURL(Some(&NSURL::fileURLWithPath(&NSString::from_str(
        &agents.to_string_lossy(),
    ))));
    panel.setPrompt(Some(&NSString::from_str("Allow access")));
    panel.setMessage(Some(&NSString::from_str(
        "Choose LaunchAgents, LaunchDaemons, Applications, or a log folder. Launchpane remembers these folders and can only access the ones you select.",
    )));
    if panel.runModal() != NSModalResponseOK {
        return Ok(false);
    }
    let mut state = lock_state()?;
    restore_once(&mut state)?;
    let mut unsaved: Option<AppError> = None;
    for url in panel.URLs() {
        let path = url_path(&url)?;
        // NSOpenPanel grants access in this process; never infer consent from a saved path.
        std::fs::read_dir(&path)?;
        let bookmark = match create_bookmark(&url) {
            Ok(bookmark) => Some(bookmark),
            Err(error) => {
                unsaved.get_or_insert(error);
                None
            }
        };
        state.grants.retain(|grant| grant.path != path);
        state.grants.push(Grant {
            path,
            bookmark,
            url,
            scoped: false,
        });
    }
    let saved = persist(&bookmark_file()?, &state.grants);
    match (unsaved, saved) {
        (None, Ok(())) => Ok(true),
        (Some(error), _) | (None, Err(error)) => Err(AppError::Message(format!(
            "Access is allowed until you quit Launchpane, but macOS couldn’t remember it: {error}"
        ))),
    }
}

#[tauri::command]
#[cfg(not(feature = "app-store"))]
pub fn choose_access_folders() -> Result<bool, AppError> {
    Err(AppError::Message(
        "Folder selection is only required in the Mac App Store edition.".into(),
    ))
}

#[tauri::command]
#[cfg(feature = "app-store")]
pub fn list_access_folders() -> Result<Vec<String>, AppError> {
    let home = crate::user_paths::home_dir()?;
    Ok(selected_folders()?
        .iter()
        .map(|path| display_path(&home, path))
        .collect())
}

#[tauri::command]
#[cfg(not(feature = "app-store"))]
pub fn list_access_folders() -> Result<Vec<String>, AppError> {
    Ok(Vec::new())
}

#[tauri::command]
#[cfg(feature = "app-store")]
pub fn forget_access_folders() -> Result<(), AppError> {
    let mut state = lock_state()?;
    // Dropping the grants stops their security scopes.
    state.grants.clear();
    state.restored = true;
    save_bookmarks(&bookmark_file()?, &[])
}

#[tauri::command]
#[cfg(not(feature = "app-store"))]
pub fn forget_access_folders() -> Result<(), AppError> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn folder_consent_is_component_bounded_and_never_inferred() {
        let selected = vec![PathBuf::from("/Users/test/Library/LaunchAgents")];
        assert!(includes_folder(
            &selected,
            Path::new("/Users/test/Library/LaunchAgents")
        ));
        assert!(includes_folder(
            &selected,
            Path::new("/Users/test/Library/LaunchAgents/test.plist")
        ));
        assert!(!includes_folder(
            &selected,
            Path::new("/Users/test/Library/LaunchAgentsOther")
        ));
        assert!(!includes_folder(
            &selected,
            Path::new("/Library/LaunchAgents")
        ));
        assert!(!includes_folder(
            &[],
            Path::new("/Users/test/Library/LaunchAgents")
        ));
    }

    #[test]
    fn display_path_abbreviates_only_the_account_home() {
        let home = Path::new("/Users/test");
        assert_eq!(
            display_path(home, Path::new("/Users/test/Library/LaunchAgents")),
            "~/Library/LaunchAgents"
        );
        assert_eq!(display_path(home, Path::new("/Users/test")), "~");
        assert_eq!(
            display_path(home, Path::new("/Users/tester/Library")),
            "/Users/tester/Library"
        );
        assert_eq!(
            display_path(home, Path::new("/Library/LaunchDaemons")),
            "/Library/LaunchDaemons"
        );
    }

    #[test]
    fn bookmark_file_round_trips_and_is_removed_when_empty() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("nested").join(BOOKMARK_FILE);
        assert!(load_bookmarks(&file).is_empty());

        save_bookmarks(&file, &[b"first".as_slice(), b"second".as_slice()]).unwrap();
        assert_eq!(
            load_bookmarks(&file),
            vec![b"first".to_vec(), b"second".to_vec()]
        );
        assert!(!file.with_extension("plist.tmp").exists());

        save_bookmarks(&file, &[]).unwrap();
        assert!(!file.exists());
        save_bookmarks(&file, &[]).unwrap();
    }

    #[test]
    fn unreadable_bookmark_file_means_no_saved_folders() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join(BOOKMARK_FILE);
        std::fs::write(&file, b"not a property list").unwrap();
        assert!(load_bookmarks(&file).is_empty());

        let wrong_shape = plist::Value::Array(vec![plist::Value::Data(vec![1])]);
        wrong_shape.to_file_xml(&file).unwrap();
        assert!(load_bookmarks(&file).is_empty());
    }

    #[cfg(feature = "app-store")]
    mod bookmarks {
        use super::*;
        use objc2_foundation::NSString;

        fn url_for(path: &Path) -> Retained<NSURL> {
            NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()))
        }

        #[test]
        fn security_scoped_bookmark_restores_the_same_folder() {
            let directory = tempfile::tempdir().unwrap();
            let folder = directory.path().canonicalize().unwrap();
            let bookmark = create_bookmark(&url_for(&folder)).unwrap();
            assert!(!bookmark.is_empty());

            let (grant, stale) = resolve_bookmark(&bookmark).unwrap();
            assert_eq!(grant.path.canonicalize().unwrap(), folder);
            assert!(!stale);
            assert!(grant.scoped);
        }

        #[test]
        fn restore_keeps_valid_grants_and_drops_unusable_ones() {
            let directory = tempfile::tempdir().unwrap();
            let folder = directory.path().join("agents");
            std::fs::create_dir(&folder).unwrap();
            let folder = folder.canonicalize().unwrap();
            let valid = create_bookmark(&url_for(&folder)).unwrap();

            let file = directory.path().join(BOOKMARK_FILE);
            save_bookmarks(
                &file,
                &[valid.as_slice(), b"garbage".as_slice(), valid.as_slice()],
            )
            .unwrap();

            let (grants, changed) = restore_grants(&file);
            assert!(changed);
            assert_eq!(grants.len(), 1);
            assert_eq!(grants[0].path.canonicalize().unwrap(), folder);

            persist(&file, &grants).unwrap();
            let (grants, changed) = restore_grants(&file);
            assert!(!changed);
            assert_eq!(grants.len(), 1);
        }

        #[test]
        fn restore_drops_folders_that_no_longer_exist() {
            let directory = tempfile::tempdir().unwrap();
            let folder = directory.path().join("gone");
            std::fs::create_dir(&folder).unwrap();
            let bookmark = create_bookmark(&url_for(&folder)).unwrap();
            std::fs::remove_dir(&folder).unwrap();

            let file = directory.path().join(BOOKMARK_FILE);
            save_bookmarks(&file, &[bookmark.as_slice()]).unwrap();
            let (grants, changed) = restore_grants(&file);
            assert!(grants.is_empty());
            assert!(changed);
        }
    }
}
