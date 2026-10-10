//! Discovery of macOS ServiceManagement login items.
//!
//! Apps register background helpers with `SMLoginItemSetEnabled`. Those helpers are
//! `.app` bundles embedded at `<App>.app/Contents/Library/LoginItems/<Helper>.app` and
//! launchd tracks them by their `CFBundleIdentifier` with no plist file on disk, so
//! `plist_util::scan_plist_files` cannot see them.

use crate::error::AppError;
use std::path::{Path, PathBuf};

/// Path fragment that marks a bundle as an embedded login item helper.
pub const LOGIN_ITEMS_FRAGMENT: &str = "/Contents/Library/LoginItems/";

#[derive(Debug, Clone, PartialEq)]
pub struct LoginItemBundle {
    /// `CFBundleIdentifier` of the helper, which is also its launchd service label.
    pub label: String,
    /// Absolute path to the helper `.app` bundle.
    pub bundle_path: String,
}

/// True when `path` points at a helper bundle embedded in another app's `LoginItems`
/// directory. Used to route a `plist_path` away from plist-only code paths.
pub fn is_login_item_path(path: &str) -> bool {
    path.contains(LOGIN_ITEMS_FRAGMENT) && path.ends_with(".app")
}

fn app_roots() -> Result<Vec<PathBuf>, AppError> {
    let mut roots = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/Applications/Utilities"),
    ];
    roots.push(crate::user_paths::home_dir()?.join("Applications"));
    roots.retain(|root| root.is_dir());
    Ok(roots)
}

fn bundle_identifier(app_bundle: &Path) -> Option<String> {
    let info = app_bundle.join("Contents/Info.plist");
    let value = plist::Value::from_file(info).ok()?;
    value
        .as_dictionary()?
        .get("CFBundleIdentifier")?
        .as_string()
        .map(String::from)
}

/// Absolute path to the helper's main executable, derived from its `Info.plist`.
pub fn bundle_executable(app_bundle: &str) -> Option<String> {
    let path = Path::new(app_bundle);
    let info = path.join("Contents/Info.plist");
    let value = plist::Value::from_file(info).ok()?;
    let name = value
        .as_dictionary()?
        .get("CFBundleExecutable")?
        .as_string()?;
    path.join("Contents/MacOS")
        .join(name)
        .to_str()
        .map(String::from)
}

fn login_items_in_app(app_bundle: &Path) -> Vec<LoginItemBundle> {
    let dir = app_bundle.join("Contents/Library/LoginItems");
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };
    entries
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("app") {
                return None;
            }
            Some(LoginItemBundle {
                label: bundle_identifier(&path)?,
                bundle_path: path.to_str()?.to_string(),
            })
        })
        .collect()
}

/// Enumerates every login item helper bundle installed under the known application roots.
/// Discovery is filesystem-based; callers decide which of these launchd actually knows about.
pub fn scan_login_items() -> Result<Vec<LoginItemBundle>, AppError> {
    let mut results = Vec::new();
    for root in app_roots()? {
        let Ok(entries) = std::fs::read_dir(&root) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("app") {
                results.extend(login_items_in_app(&path));
            }
        }
    }
    results.sort_by(|a, b| a.label.cmp(&b.label));
    results.dedup_by(|a, b| a.bundle_path == b.bundle_path);
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_login_item_path() {
        assert!(is_login_item_path(
            "/Applications/Spotify.app/Contents/Library/LoginItems/StartUpHelper.app"
        ));
        assert!(!is_login_item_path(
            "/Users/me/Library/LaunchAgents/com.example.test.plist"
        ));
        assert!(!is_login_item_path("/Applications/Spotify.app"));
        // The fragment must be followed by an .app bundle, not an arbitrary file.
        assert!(!is_login_item_path(
            "/Applications/Spotify.app/Contents/Library/LoginItems/readme.txt"
        ));
    }
}
