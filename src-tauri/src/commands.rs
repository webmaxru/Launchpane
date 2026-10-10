use crate::error::AppError;
use crate::launchctl;
use crate::login_items;
use crate::plist_util;
use crate::types::PlistConfig;
use crate::types::{JobListEntry, JobSource, JobStatus, LaunchdJob};
use std::collections::HashMap;
#[cfg(not(feature = "app-store"))]
use std::time::Duration;
#[cfg(not(feature = "app-store"))]
use tauri::Manager;

fn get_last_run_at(config: &PlistConfig) -> Option<String> {
    let paths = [&config.standard_out_path, &config.standard_error_path];
    let mut latest: Option<u64> = None;

    for path in paths.into_iter().flatten() {
        if let Ok(metadata) = std::fs::metadata(path) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                    let millis = duration.as_secs() * 1000 + u64::from(duration.subsec_millis());
                    latest = Some(latest.map_or(millis, |prev: u64| prev.max(millis)));
                }
            }
        }
    }

    latest.map(|ms| ms.to_string())
}

/// True when a program/argument path looks like a vendor app binary rather than a
/// user-authored script: it lives in /Applications, inside an `.app` bundle, or under
/// `~/Library/Application Support` (where auto-updaters install themselves).
fn is_app_path(path: &str) -> bool {
    path.starts_with("/Applications/")
        || path.contains(".app/")
        || path.contains("/Library/Application Support/")
}

/// True when `s` references a path under the user's home directory that is not itself an
/// app-bundle path. Used to confirm the agent actually runs a script the user owns.
/// `s` may be a bare path argument or a `zsh -c` command string with the path inside it.
fn references_home_path(s: &str, home: &str) -> bool {
    s.contains(home) && !is_app_path(s)
}

/// Classifies a user agent as a "Home" agent: a user-authored automation (e.g. a shell or
/// python script under `~/`) rather than a vendor-installed app. Requires that the launched
/// executable is not an app bundle AND that some program path points under the home directory.
fn is_home_agent(source: &JobSource, config: &PlistConfig) -> bool {
    if *source != JobSource::UserAgent {
        return false;
    }
    let home = match dirs::home_dir() {
        Some(h) => h.to_string_lossy().into_owned(),
        None => return false,
    };
    if home.is_empty() {
        return false;
    }

    // The executable actually launched: `Program`, else the first `ProgramArguments` entry
    // (which for scripts is usually the interpreter, e.g. /bin/bash).
    let executable = config.program.clone().or_else(|| {
        config
            .program_arguments
            .as_ref()
            .and_then(|a| a.first().cloned())
    });
    let Some(exe) = executable else {
        return false;
    };
    if is_app_path(&exe) {
        return false;
    }

    // Require at least one referenced path under the user's home directory (the script itself).
    let mut strings: Vec<&str> = Vec::new();
    if let Some(ref p) = config.program {
        strings.push(p);
    }
    if let Some(ref args) = config.program_arguments {
        strings.extend(args.iter().map(String::as_str));
    }
    strings.iter().any(|s| references_home_path(s, &home))
}

/// Login items are owned by their parent application. The app may only flip their
/// launchd enable override; load/unload/run/remove would corrupt another app's bundle.
fn ensure_not_login_item(plist_path: &str, action: &str) -> Result<(), AppError> {
    if login_items::is_login_item_path(plist_path) {
        return Err(AppError::Launchctl(format!(
            "Login items cannot be {action}. They are managed by their parent app; use Enable or Disable instead."
        )));
    }
    Ok(())
}

fn ensure_user_agent(plist_path: &str) -> Result<(), AppError> {
    ensure_not_login_item(plist_path, "controlled directly")?;
    let home = dirs::home_dir().unwrap_or_default();
    let user_agents = home.join("Library/LaunchAgents");
    if !std::path::Path::new(plist_path).starts_with(&user_agents) {
        return Err(AppError::Launchctl(
            "Cannot start/stop system agents or daemons. Only user agents (~/Library/LaunchAgents) can be managed."
                .to_string(),
        ));
    }
    Ok(())
}

fn source_for_path(plist_path: &str) -> Option<JobSource> {
    if login_items::is_login_item_path(plist_path) {
        return Some(JobSource::LoginItem);
    }
    let home = dirs::home_dir().unwrap_or_default();
    let user_agents = home.join("Library/LaunchAgents");
    let path = std::path::Path::new(plist_path);
    if path.starts_with(user_agents) {
        Some(JobSource::UserAgent)
    } else if path.starts_with("/Library/LaunchAgents") {
        Some(JobSource::SystemAgent)
    } else if path.starts_with("/Library/LaunchDaemons") {
        Some(JobSource::SystemDaemon)
    } else {
        None
    }
}

fn ensure_toggle_allowed(plist_path: &str, source: &JobSource) -> Result<(), AppError> {
    let actual_source = source_for_path(plist_path).ok_or_else(|| {
        AppError::Launchctl("Cannot manage a plist outside known launchd directories.".to_string())
    })?;
    if &actual_source != source {
        return Err(AppError::Launchctl(
            "Job source does not match its plist path.".to_string(),
        ));
    }
    // User agents and login items both live in the user's own GUI domain.
    let user_owned = matches!(actual_source, JobSource::UserAgent | JobSource::LoginItem);
    if !user_owned && !launchctl::is_administrator() {
        return Err(AppError::Launchctl(
            "Administrator mode is required to manage system jobs.".to_string(),
        ));
    }
    Ok(())
}

fn domain_for_source(source: &JobSource) -> String {
    match source {
        JobSource::SystemDaemon => "system".to_string(),
        JobSource::UserAgent | JobSource::SystemAgent | JobSource::LoginItem => {
            launchctl::gui_domain()
        }
    }
}

fn effective_enabled(
    disabled_overrides: &HashMap<String, bool>,
    label: &str,
    plist_disabled: Option<bool>,
) -> bool {
    !disabled_overrides
        .get(label)
        .copied()
        .unwrap_or(plist_disabled.unwrap_or(false))
}

fn disabled_overrides_for_source(source: &JobSource) -> Result<HashMap<String, bool>, AppError> {
    let domain = domain_for_source(source);
    launchctl::list_disabled(&domain)
}

fn verified_enabled_state(
    source: &JobSource,
    label: &str,
    plist_path: &str,
) -> Result<bool, AppError> {
    let disabled_overrides = disabled_overrides_for_source(source)?;
    // Login items have no plist, so only the launchctl override decides.
    let plist_disabled = if *source == JobSource::LoginItem {
        None
    } else {
        plist_util::parse_plist(plist_path)
            .ok()
            .and_then(|config| config.disabled)
    };
    Ok(effective_enabled(
        &disabled_overrides,
        label,
        plist_disabled,
    ))
}

#[tauri::command]
pub async fn list_jobs() -> Result<Vec<JobListEntry>, AppError> {
    let plist_files = plist_util::scan_plist_files();
    let loaded = launchctl::list_loaded().unwrap_or_default();
    let gui_domain = launchctl::gui_domain();
    let gui_disabled = launchctl::list_disabled(&gui_domain).unwrap_or_default();
    let system_disabled = launchctl::list_disabled("system").unwrap_or_default();

    let loaded_map: HashMap<String, &launchctl::LoadedService> =
        loaded.iter().map(|s| (s.label.clone(), s)).collect();

    let mut entries = Vec::new();
    for (path, source) in plist_files {
        let config = match plist_util::parse_plist(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let (status, pid, exit_code) = if let Some(svc) = loaded_map.get(&config.label) {
            let status = if svc.pid.is_some() {
                JobStatus::Running
            } else {
                JobStatus::Loaded
            };
            (status, svc.pid, svc.last_exit_code)
        } else {
            (JobStatus::Unloaded, None, None)
        };

        let last_run_at = get_last_run_at(&config);
        let home_agent = is_home_agent(&source, &config);
        let enabled = effective_enabled(
            match &source {
                JobSource::SystemDaemon => &system_disabled,
                JobSource::UserAgent | JobSource::SystemAgent | JobSource::LoginItem => {
                    &gui_disabled
                }
            },
            &config.label,
            config.disabled,
        );
        entries.push(JobListEntry {
            label: config.label,
            pid,
            last_exit_code: exit_code,
            plist_path: path,
            source,
            status,
            enabled,
            last_run_at,
            is_home_agent: home_agent,
        });
    }

    let extras = login_item_entries(&loaded_map, &gui_disabled, &entries);
    entries.extend(extras);

    entries.sort_by(|a, b| a.label.cmp(&b.label));
    Ok(entries)
}

/// Builds list entries for ServiceManagement login items that launchd actually knows
/// about. Helper bundles that are installed but never registered are skipped: they do not
/// autostart and cannot be managed meaningfully.
fn login_item_entries(
    loaded_map: &HashMap<String, &launchctl::LoadedService>,
    gui_disabled: &HashMap<String, bool>,
    existing: &[JobListEntry],
) -> Vec<JobListEntry> {
    let known_labels: std::collections::HashSet<&str> =
        existing.iter().map(|e| e.label.as_str()).collect();

    login_items::scan_login_items()
        .into_iter()
        .filter(|item| !known_labels.contains(item.label.as_str()))
        .filter_map(|item| {
            let service = loaded_map.get(&item.label);
            let override_state = gui_disabled.get(&item.label).copied();
            if service.is_none() && override_state.is_none() {
                return None;
            }

            let (status, pid, last_exit_code) = match service {
                Some(svc) if svc.pid.is_some() => (JobStatus::Running, svc.pid, svc.last_exit_code),
                Some(svc) => (JobStatus::Loaded, None, svc.last_exit_code),
                None => (JobStatus::Unloaded, None, None),
            };

            Some(JobListEntry {
                label: item.label,
                pid,
                last_exit_code,
                plist_path: item.bundle_path,
                source: JobSource::LoginItem,
                status,
                enabled: !override_state.unwrap_or(false),
                // Login items have no plist-declared log files, so there is nothing to
                // derive a last-run timestamp from.
                last_run_at: None,
                is_home_agent: false,
            })
        })
        .collect()
}

/// Builds detail for a login item. There is no plist to parse, so the config carries only
/// what the helper bundle itself declares; every plist-only field stays empty.
fn login_item_detail(bundle_path: String) -> Result<LaunchdJob, AppError> {
    let label = login_items::scan_login_items()
        .into_iter()
        .find(|item| item.bundle_path == bundle_path)
        .map(|item| item.label)
        .ok_or_else(|| AppError::NotFound(bundle_path.clone()))?;

    let loaded = launchctl::list_loaded().unwrap_or_default();
    let svc = loaded.iter().find(|s| s.label == label);
    let (status, pid, exit_code) = match svc {
        Some(s) if s.pid.is_some() => (JobStatus::Running, s.pid, s.last_exit_code),
        Some(s) => (JobStatus::Loaded, None, s.last_exit_code),
        None => (JobStatus::Unloaded, None, None),
    };

    Ok(LaunchdJob {
        label: label.clone(),
        plist_path: bundle_path.clone(),
        source: JobSource::LoginItem,
        status,
        pid,
        last_exit_code: exit_code,
        plist: PlistConfig {
            label,
            program: login_items::bundle_executable(&bundle_path),
            program_arguments: None,
            run_at_load: None,
            keep_alive: None,
            start_interval: None,
            start_calendar_interval: None,
            standard_out_path: None,
            standard_error_path: None,
            working_directory: None,
            environment_variables: None,
            disabled: None,
            wake_system: None,
            raw_xml: String::new(),
        },
        last_run_at: None,
    })
}

#[tauri::command]
pub async fn get_job_detail(plist_path: String) -> Result<LaunchdJob, AppError> {
    if !std::path::Path::new(&plist_path).exists() {
        return Err(AppError::NotFound(plist_path));
    }

    if login_items::is_login_item_path(&plist_path) {
        return login_item_detail(plist_path);
    }

    let plist = plist_util::parse_plist(&plist_path)?;
    let loaded = launchctl::list_loaded().unwrap_or_default();

    let svc = loaded.iter().find(|s| s.label == plist.label);
    let (status, pid, exit_code) = match svc {
        Some(s) => {
            let status = if s.pid.is_some() {
                JobStatus::Running
            } else {
                JobStatus::Loaded
            };
            (status, s.pid, s.last_exit_code)
        }
        None => (JobStatus::Unloaded, None, None),
    };

    let source = if plist_path.contains("/Library/LaunchDaemons") {
        crate::types::JobSource::SystemDaemon
    } else if plist_path.starts_with("/Library/LaunchAgents") {
        crate::types::JobSource::SystemAgent
    } else {
        crate::types::JobSource::UserAgent
    };

    let last_run_at = get_last_run_at(&plist);
    Ok(LaunchdJob {
        label: plist.label.clone(),
        plist_path,
        source,
        status,
        pid,
        last_exit_code: exit_code,
        plist,
        last_run_at,
    })
}

#[tauri::command]
pub async fn start_job(plist_path: String) -> Result<(), AppError> {
    ensure_user_agent(&plist_path)?;
    // Unload first to avoid "already loaded" or stale state
    let _ = launchctl::bootout(&plist_path);
    launchctl::bootstrap(&plist_path)
}

#[tauri::command]
pub async fn stop_job(plist_path: String) -> Result<(), AppError> {
    ensure_user_agent(&plist_path)?;
    launchctl::bootout(&plist_path)
}

#[tauri::command]
pub async fn restart_job(plist_path: String) -> Result<(), AppError> {
    ensure_user_agent(&plist_path)?;
    let _ = launchctl::bootout(&plist_path);
    launchctl::bootstrap(&plist_path)
}

#[tauri::command]
pub async fn kickstart_job(label: String, plist_path: String) -> Result<(), AppError> {
    ensure_user_agent(&plist_path)?;
    // Ensure the service is loaded before kickstarting
    let loaded = launchctl::list_loaded().unwrap_or_default();
    let is_loaded = loaded.iter().any(|s| s.label == label);
    if !is_loaded {
        launchctl::bootstrap(&plist_path)?;
    }
    launchctl::kickstart(&label)
}

#[tauri::command]
pub async fn enable_job(
    label: String,
    plist_path: String,
    source: JobSource,
) -> Result<bool, AppError> {
    ensure_toggle_allowed(&plist_path, &source)?;
    launchctl::enable(&domain_for_source(&source), &label)?;
    let enabled = verified_enabled_state(&source, &label, &plist_path)?;
    if !enabled {
        return Err(AppError::Launchctl(format!(
            "launchctl enable succeeded, but '{label}' is still disabled. The plist's Disabled key may be overriding the launchctl override."
        )));
    }
    Ok(enabled)
}

#[tauri::command]
pub async fn disable_job(
    label: String,
    plist_path: String,
    source: JobSource,
) -> Result<bool, AppError> {
    ensure_toggle_allowed(&plist_path, &source)?;
    launchctl::disable(&domain_for_source(&source), &label)?;
    let enabled = verified_enabled_state(&source, &label, &plist_path)?;
    if enabled {
        return Err(AppError::Launchctl(format!(
            "launchctl disable succeeded, but '{label}' is still enabled. The plist's Disabled key may be overriding the launchctl override."
        )));
    }
    Ok(enabled)
}

#[derive(serde::Serialize)]
pub struct RuntimeInfo {
    is_administrator: bool,
    can_restart_as_administrator: bool,
    review_demo: bool,
}

#[tauri::command]
pub async fn get_runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        is_administrator: launchctl::is_administrator(),
        can_restart_as_administrator: !cfg!(feature = "app-store"),
        review_demo: !cfg!(feature = "app-store")
            && std::env::var_os("LAUNCHPANE_REVIEW_DEMO").is_some(),
    }
}

#[cfg(any(not(feature = "app-store"), test))]
fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

#[cfg(any(not(feature = "app-store"), test))]
fn administrator_launch_command(
    executable: &std::path::Path,
    home: &std::path::Path,
    user_uid: u32,
) -> String {
    format!(
        "env HOME={} LAUNCHPANE_USER_UID={} {} </dev/null >/tmp/launchpane-admin.log 2>&1 & echo $!",
        shell_quote(&home.to_string_lossy()),
        user_uid,
        shell_quote(&executable.to_string_lossy())
    )
}

#[cfg(any(not(feature = "app-store"), test))]
fn process_effective_uid(pid: u32) -> Option<u32> {
    let output = std::process::Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "uid="])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout).trim().parse().ok()
}

#[tauri::command]
#[cfg(feature = "app-store")]
pub async fn restart_as_administrator(_app: tauri::AppHandle) -> Result<(), AppError> {
    Err(AppError::Launchctl(
        "Administrator mode is not available in the Mac App Store build.".to_string(),
    ))
}

#[tauri::command]
#[cfg(not(feature = "app-store"))]
pub async fn restart_as_administrator(app: tauri::AppHandle) -> Result<(), AppError> {
    if launchctl::is_administrator() {
        return Ok(());
    }

    let executable = std::env::current_exe()?;
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::Launchctl("could not determine home directory".to_string()))?;
    let command = administrator_launch_command(&executable, &home, launchctl::effective_uid());
    let output = std::process::Command::new("osascript")
        .args([
            "-e",
            "on run argv",
            "-e",
            "do shell script (item 1 of argv) with administrator privileges",
            "-e",
            "end run",
            "--",
        ])
        .arg(command)
        .output()?;

    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "administrator relaunch failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    let pid = String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u32>()
        .map_err(|_| {
            AppError::Launchctl(format!(
                "administrator relaunch returned an invalid process id: {}",
                String::from_utf8_lossy(&output.stdout).trim()
            ))
        })?;

    let mut administrator_ready = false;
    for _ in 0..30 {
        if process_effective_uid(pid) == Some(0) {
            administrator_ready = true;
            break;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    if !administrator_ready {
        let log = std::fs::read_to_string("/tmp/launchpane-admin.log").unwrap_or_default();
        return Err(AppError::Launchctl(format!(
            "administrator process did not start{}",
            if log.trim().is_empty() {
                String::new()
            } else {
                format!(": {}", log.trim())
            }
        )));
    }

    let activation_script = format!(
        "tell application \"System Events\" to set frontmost of first process whose unix id is {pid} to true"
    );
    for _ in 0..30 {
        if std::process::Command::new("osascript")
            .args(["-e", &activation_script])
            .status()
            .is_ok_and(|status| status.success())
        {
            break;
        }
        std::thread::sleep(Duration::from_millis(100));
    }

    if !cfg!(debug_assertions) {
        app.exit(0);
    } else {
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(250));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        });
    }
    Ok(())
}

#[tauri::command]
pub async fn save_job(plist_path: String, config: PlistConfig) -> Result<(), AppError> {
    ensure_not_login_item(&plist_path, "edited")?;
    plist_util::write_plist(&plist_path, &config)
}

#[tauri::command]
pub async fn create_job(label: String, config: PlistConfig) -> Result<String, AppError> {
    let agents_dir = plist_util::get_user_agents_dir();
    if !agents_dir.exists() {
        std::fs::create_dir_all(&agents_dir)?;
    }
    // Create log directories if log paths are set
    for log_path in [&config.standard_out_path, &config.standard_error_path]
        .into_iter()
        .flatten()
    {
        if let Some(parent) = std::path::Path::new(log_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
    }
    let path = agents_dir.join(format!("{label}.plist"));
    let path_str = path
        .to_str()
        .ok_or_else(|| AppError::Plist("invalid path".to_string()))?
        .to_string();
    plist_util::write_plist(&path_str, &config)?;
    Ok(path_str)
}

#[tauri::command]
pub async fn save_raw_plist(plist_path: String, xml: String) -> Result<(), AppError> {
    ensure_not_login_item(&plist_path, "edited")?;
    plist_util::write_raw_plist(&plist_path, &xml)
}

#[tauri::command]
pub async fn delete_job(plist_path: String, label: String) -> Result<(), AppError> {
    ensure_not_login_item(&plist_path, "removed")?;
    let _ = launchctl::bootout(&plist_path);
    let _ = launchctl::disable(&launchctl::gui_domain(), &label);
    if std::path::Path::new(&plist_path).exists() {
        std::fs::remove_file(&plist_path)?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct LogFileResult {
    content: String,
    modified_at: Option<String>,
}

#[tauri::command]
pub async fn read_log_file(
    path: String,
    tail_lines: Option<usize>,
) -> Result<LogFileResult, AppError> {
    if !std::path::Path::new(&path).exists() {
        return Err(AppError::NotFound(format!("log file not found: {path}")));
    }

    let metadata = std::fs::metadata(&path)?;
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| {
            let duration = t.duration_since(std::time::UNIX_EPOCH).ok()?;
            Some(duration.as_secs())
        })
        .map(|secs| {
            // ISO 8601 timestamp in UTC (frontend will format to local)
            let secs_i64 = secs as i64;
            format!(
                "{}",
                secs_i64 * 1000 // milliseconds for JS Date
            )
        });

    let content = std::fs::read_to_string(&path)?;
    let content = match tail_lines {
        Some(n) => {
            let lines: Vec<&str> = content.lines().collect();
            let start = lines.len().saturating_sub(n);
            lines[start..].join("\n")
        }
        None => content,
    };

    Ok(LogFileResult {
        content,
        modified_at,
    })
}

#[tauri::command]
pub async fn clear_log_file(path: String) -> Result<(), AppError> {
    if !std::path::Path::new(&path).exists() {
        return Err(AppError::NotFound(format!("log file not found: {path}")));
    }
    std::fs::write(&path, "")?;
    Ok(())
}

#[tauri::command]
pub async fn open_log_in_editor(path: String) -> Result<(), AppError> {
    std::process::Command::new("open")
        .arg("-t")
        .arg(&path)
        .spawn()?;
    Ok(())
}

#[tauri::command]
pub async fn get_home_dir() -> Result<String, AppError> {
    dirs::home_dir()
        .and_then(|p| p.to_str().map(String::from))
        .ok_or_else(|| AppError::Launchctl("could not determine home directory".to_string()))
}

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), AppError> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg(program: Option<&str>, args: Option<Vec<&str>>) -> PlistConfig {
        PlistConfig {
            label: "test".to_string(),
            program: program.map(String::from),
            program_arguments: args.map(|a| a.into_iter().map(String::from).collect()),
            run_at_load: None,
            keep_alive: None,
            start_interval: None,
            start_calendar_interval: None,
            standard_out_path: None,
            standard_error_path: None,
            working_directory: None,
            environment_variables: None,
            disabled: None,
            wake_system: None,
            raw_xml: String::new(),
        }
    }

    #[test]
    fn test_is_app_path() {
        assert!(is_app_path(
            "/Applications/Mailspring.app/Contents/MacOS/Mailspring"
        ));
        assert!(is_app_path(
            "/Users/x/Library/Application Support/Google/GoogleUpdater/Current/GoogleUpdater.app/Contents/MacOS/GoogleUpdater"
        ));
        assert!(!is_app_path("/bin/bash"));
        assert!(!is_app_path("/Users/x/instagent-launcher.sh"));
    }

    #[test]
    fn test_references_home_path() {
        let home = "/Users/x";
        assert!(references_home_path("/Users/x/instagent-launcher.sh", home));
        // Home path embedded inside a `zsh -c` command string.
        assert!(references_home_path(
            "cd \"/Users/x/ClaudeCoding/vimeo\" && python3 refresh.py",
            home
        ));
        // Only a vendor app path under home -> not a user script.
        assert!(!references_home_path(
            "/Users/x/Library/Application Support/Google/GoogleUpdater.app/foo",
            home
        ));
        assert!(!references_home_path("/bin/bash", home));
    }

    #[test]
    fn test_is_home_agent_classification() {
        let home = dirs::home_dir().unwrap().to_string_lossy().into_owned();

        // instagent-style: interpreter running a home script.
        let launcher = format!("{home}/instagent-launcher.sh");
        let instagent = cfg(None, Some(vec!["/bin/bash", &launcher]));
        assert!(is_home_agent(&JobSource::UserAgent, &instagent));

        // vimeo-style: zsh -c with the home path inside the command string.
        let command = format!("cd \"{home}/ClaudeCoding/vimeo\" && python3 refresh.py");
        let vimeo = cfg(None, Some(vec!["/bin/zsh", "-l", "-c", &command]));
        assert!(is_home_agent(&JobSource::UserAgent, &vimeo));

        // Vendor app in /Applications -> not a home agent.
        let mailspring = cfg(
            None,
            Some(vec![
                "/Applications/Mailspring.app/Contents/MacOS/Mailspring",
            ]),
        );
        assert!(!is_home_agent(&JobSource::UserAgent, &mailspring));

        // Vendor auto-updater under ~/Library/Application Support -> not a home agent.
        let updater = format!(
            "{home}/Library/Application Support/Google/GoogleUpdater.app/Contents/MacOS/GoogleUpdater"
        );
        let google = cfg(Some(&updater), None);
        assert!(!is_home_agent(&JobSource::UserAgent, &google));

        // Home script but classified as a system agent -> excluded (Home is a User subset).
        assert!(!is_home_agent(&JobSource::SystemAgent, &instagent));
    }

    #[test]
    fn test_domain_for_source() {
        assert_eq!(domain_for_source(&JobSource::SystemDaemon), "system");
        assert!(domain_for_source(&JobSource::UserAgent).starts_with("gui/"));
        assert!(domain_for_source(&JobSource::SystemAgent).starts_with("gui/"));
        assert!(domain_for_source(&JobSource::LoginItem).starts_with("gui/"));
    }

    const LOGIN_ITEM_PATH: &str =
        "/Applications/Spotify.app/Contents/Library/LoginItems/StartUpHelper.app";

    #[test]
    fn test_source_for_path_classifies_login_items() {
        assert_eq!(source_for_path(LOGIN_ITEM_PATH), Some(JobSource::LoginItem));
        assert_eq!(
            source_for_path("/Library/LaunchDaemons/com.example.plist"),
            Some(JobSource::SystemDaemon)
        );
    }

    #[test]
    fn test_login_items_are_toggleable_without_administrator() {
        // Login items live in the user's own GUI domain, so no admin escalation is needed.
        assert!(ensure_toggle_allowed(LOGIN_ITEM_PATH, &JobSource::LoginItem).is_ok());
    }

    #[test]
    fn test_login_items_reject_plist_only_actions() {
        assert!(ensure_not_login_item(LOGIN_ITEM_PATH, "removed").is_err());
        assert!(ensure_user_agent(LOGIN_ITEM_PATH).is_err());
        assert!(ensure_not_login_item("/Users/me/Library/LaunchAgents/a.plist", "removed").is_ok());
    }

    #[test]
    fn test_effective_enabled_disabled_override_wins_over_enabled_plist() {
        let mut overrides = HashMap::new();
        overrides.insert("test".to_string(), true);

        assert!(!effective_enabled(&overrides, "test", Some(false)));
    }

    #[test]
    fn test_effective_enabled_enabled_override_wins_over_disabled_plist() {
        let mut overrides = HashMap::new();
        overrides.insert("test".to_string(), false);

        assert!(effective_enabled(&overrides, "test", Some(true)));
    }

    #[test]
    fn test_effective_enabled_falls_back_to_disabled_plist() {
        let overrides = HashMap::new();

        assert!(!effective_enabled(&overrides, "test", Some(true)));
    }

    #[test]
    fn test_effective_enabled_defaults_to_enabled_without_override_or_plist_key() {
        let overrides = HashMap::new();

        assert!(effective_enabled(&overrides, "test", None));
    }

    #[test]
    fn test_shell_quote() {
        assert_eq!(shell_quote("/tmp/launchpane"), "'/tmp/launchpane'");
        assert_eq!(shell_quote("/tmp/user's app"), "'/tmp/user'\\''s app'");
    }

    #[test]
    fn test_administrator_launch_command_detaches_without_nohup() {
        let command = administrator_launch_command(
            std::path::Path::new("/tmp/launchpane"),
            std::path::Path::new("/Users/test user"),
            501,
        );

        assert_eq!(
            command,
            "env HOME='/Users/test user' LAUNCHPANE_USER_UID=501 '/tmp/launchpane' </dev/null >/tmp/launchpane-admin.log 2>&1 & echo $!"
        );
        assert!(!command.contains("nohup"));
    }

    #[test]
    fn test_process_effective_uid_reads_current_process() {
        assert_eq!(
            process_effective_uid(std::process::id()),
            Some(launchctl::effective_uid())
        );
    }
}
