use crate::error::AppError;
#[cfg(any(feature = "app-store", test))]
use std::path::{Path, PathBuf};
#[cfg(feature = "app-store")]
use std::sync::Mutex;

#[cfg(feature = "app-store")]
static SELECTED_FOLDERS: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());

#[cfg(feature = "app-store")]
pub fn selected_folders() -> Result<Vec<PathBuf>, AppError> {
    SELECTED_FOLDERS
        .lock()
        .map(|folders| folders.clone())
        .map_err(|_| {
            AppError::Message("Could not read folder permissions. Restart Launchpane.".into())
        })
}

#[cfg(any(feature = "app-store", test))]
pub fn includes_folder(selected: &[PathBuf], path: &Path) -> bool {
    selected.iter().any(|folder| path.starts_with(folder))
}

// Synchronous Tauri commands run on the main thread, as required by NSOpenPanel.
#[tauri::command]
#[cfg(feature = "app-store")]
pub fn choose_access_folders() -> Result<bool, AppError> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSModalResponseOK, NSOpenPanel};
    use objc2_foundation::{NSString, NSURL};

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
        "Choose LaunchAgents, LaunchDaemons, Applications, or a log folder. Only selected folders are accessible. Select them again after restarting Launchpane.",
    )));
    if panel.runModal() != NSModalResponseOK {
        return Ok(false);
    }
    let mut folders = SELECTED_FOLDERS.lock().map_err(|_| {
        AppError::Message("Could not save folder permissions. Restart Launchpane.".into())
    })?;
    for url in panel.URLs() {
        let path = url.path().ok_or_else(|| {
            AppError::Message("The selected folder has no local filesystem path.".into())
        })?;
        let path = PathBuf::from(path.to_string());
        // NSOpenPanel grants access in this process; never infer consent from a saved path.
        std::fs::read_dir(&path)?;
        if !folders.contains(&path) {
            folders.push(path);
        }
    }
    Ok(true)
}

#[tauri::command]
#[cfg(not(feature = "app-store"))]
pub fn choose_access_folders() -> Result<bool, AppError> {
    Err(AppError::Message(
        "Folder selection is only required in the Mac App Store edition.".into(),
    ))
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
}
