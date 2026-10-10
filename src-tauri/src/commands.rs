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
    let home = match crate::user_paths::home_dir() {
        Ok(h) => h.to_string_lossy().into_owned(),
        Err(_) => return false,
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

/// Login items have no standalone launchd plist to load, edit or remove.
fn ensure_not_login_item(plist_path: &str, action: &str) -> Result<(), AppError> {
    if login_items::is_login_item_path(plist_path) {
        return Err(AppError::Launchctl(format!(
            "Login items cannot be {action}. Their parent app owns registration and bundle files; use the supported runtime controls instead."
        )));
    }
    Ok(())
}

fn ensure_user_agent(plist_path: &str) -> Result<(), AppError> {
    ensure_not_login_item(plist_path, "controlled directly")?;
    let home = crate::user_paths::home_dir()?;
    let user_agents = home.join("Library/LaunchAgents");
    if !std::path::Path::new(plist_path).starts_with(&user_agents) {
        return Err(AppError::Launchctl(
            "Only user-agent plist files (~/Library/LaunchAgents) can be edited or removed. Shared system configuration is protected."
                .to_string(),
        ));
    }
    Ok(())
}

fn source_for_path(plist_path: &str) -> Option<JobSource> {
    if login_items::is_login_item_path(plist_path) {
        return Some(JobSource::LoginItem);
    }
    let home = crate::user_paths::home_dir().ok()?;
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
    ensure_store_control_allowed(source, false)?;
    // /Library LaunchAgents run in the current user's GUI domain too. Their
    // root-owned plist is not being edited by launchctl lifecycle operations.
    let user_owned = actual_source != JobSource::SystemDaemon;
    if !user_owned && !launchctl::is_administrator() {
        return Err(AppError::Launchctl(
            "Administrator mode is required to manage system daemons.".to_string(),
        ));
    }
    Ok(())
}

fn ensure_store_control_allowed(source: &JobSource, lifecycle: bool) -> Result<(), AppError> {
    if cfg!(feature = "app-store") {
        if matches!(source, JobSource::SystemAgent | JobSource::SystemDaemon) {
            return Err(AppError::Launchctl(
                "Unavailable in the Mac App Store edition: shared agents and system daemons are read-only."
                    .to_string(),
            ));
        }
        if *source == JobSource::LoginItem && lifecycle {
            return Err(AppError::Launchctl(
                "Unavailable in the Mac App Store edition: login helpers support Enable and Disable only; their parent app manages their lifecycle."
                    .to_string(),
            ));
        }
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
        plist_util::parse_plist(plist_path)?.disabled
    };
    Ok(effective_enabled(
        &disabled_overrides,
        label,
        plist_disabled,
    ))
}

#[tauri::command]
pub async fn list_jobs() -> Result<Vec<JobListEntry>, AppError> {
    let plist_files = plist_util::scan_plist_files()?;
    let gui_domain = launchctl::gui_domain();
    let loaded = launchctl::list_loaded(&gui_domain)?;
    let system_loaded = launchctl::list_loaded("system")?;
    let gui_disabled = launchctl::list_disabled(&gui_domain)?;
    let system_disabled = launchctl::list_disabled("system")?;

    let loaded_map: HashMap<String, &launchctl::LoadedService> =
        loaded.iter().map(|s| (s.label.clone(), s)).collect();
    let system_loaded_map: HashMap<String, &launchctl::LoadedService> =
        system_loaded.iter().map(|s| (s.label.clone(), s)).collect();

    let mut entries = Vec::new();
    for (path, source) in plist_files {
        let config = match plist_util::parse_plist(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let services = if source == JobSource::SystemDaemon {
            &system_loaded_map
        } else {
            &loaded_map
        };
        let (status, pid, exit_code) = if let Some(svc) = services.get(&config.label) {
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

    let extras = login_item_entries(&loaded_map, &gui_disabled, &entries)?;
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
) -> Result<Vec<JobListEntry>, AppError> {
    let known_labels: std::collections::HashSet<&str> =
        existing.iter().map(|e| e.label.as_str()).collect();

    Ok(login_items::scan_login_items()?
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
        .collect())
}

/// Builds detail for a login item. There is no plist to parse, so the config carries only
/// what the helper bundle itself declares; every plist-only field stays empty.
fn login_item_detail(bundle_path: String) -> Result<LaunchdJob, AppError> {
    let label = login_items::scan_login_items()?
        .into_iter()
        .find(|item| item.bundle_path == bundle_path)
        .map(|item| item.label)
        .ok_or_else(|| AppError::NotFound(bundle_path.clone()))?;

    let loaded = launchctl::list_loaded(&launchctl::gui_domain())?;
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
    let source = source_for_path(&plist_path)
        .ok_or_else(|| AppError::Launchctl("Unknown launchd directory.".to_string()))?;
    let loaded = launchctl::list_loaded(&domain_for_source(&source))?;

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
    ensure_not_login_item(&plist_path, "loaded from a plist")?;
    let (domain, label) = control_target(&plist_path, true)?;
    require_enabled(&plist_path, &label)?;
    if is_loaded(&domain, &label)? {
        return Err(AppError::Launchctl(
            "Already loaded. Use Run now or Restart.".to_string(),
        ));
    }
    launchctl::bootstrap(&domain, &plist_path)?;
    verify_loaded(&domain, &label, true)
}

#[tauri::command]
pub async fn stop_job(plist_path: String) -> Result<(), AppError> {
    let (domain, label) = control_target(&plist_path, true)?;
    launchctl::bootout(&domain, &label)?;
    verify_loaded(&domain, &label, false)
}

#[tauri::command]
pub async fn restart_job(plist_path: String) -> Result<(), AppError> {
    let (domain, label) = control_target(&plist_path, true)?;
    if !is_loaded(&domain, &label)? {
        return Err(AppError::Launchctl(
            "Load the service before restarting it.".to_string(),
        ));
    }
    launchctl::kickstart(&domain, &label, true)?;
    verify_loaded(&domain, &label, true)
}

#[tauri::command]
pub async fn kickstart_job(label: String, plist_path: String) -> Result<(), AppError> {
    let (domain, actual_label) = control_target(&plist_path, true)?;
    if label != actual_label {
        return Err(AppError::Launchctl(
            "Label does not match the selected service.".to_string(),
        ));
    }
    if !is_loaded(&domain, &label)? {
        return Err(AppError::Launchctl(
            "Load the service before running it.".to_string(),
        ));
    }
    launchctl::kickstart(&domain, &label, false)?;
    verify_loaded(&domain, &label, true)
}

fn control_target(plist_path: &str, lifecycle: bool) -> Result<(String, String), AppError> {
    let source = source_for_path(plist_path)
        .ok_or_else(|| AppError::Launchctl("Unknown launchd directory.".to_string()))?;
    ensure_toggle_allowed(plist_path, &source)?;
    ensure_store_control_allowed(&source, lifecycle)?;
    let label = if source == JobSource::LoginItem {
        login_items::scan_login_items()?
            .into_iter()
            .find(|item| item.bundle_path == plist_path)
            .map(|item| item.label)
            .ok_or_else(|| AppError::NotFound(plist_path.to_string()))?
    } else {
        plist_util::parse_plist(plist_path)?.label
    };
    Ok((domain_for_source(&source), label))
}

fn require_enabled(plist_path: &str, label: &str) -> Result<(), AppError> {
    let source = source_for_path(plist_path)
        .ok_or_else(|| AppError::Launchctl("Unknown launchd directory.".to_string()))?;
    if !verified_enabled_state(&source, label, plist_path)? {
        return Err(AppError::Launchctl(
            "Enable this service before loading it.".to_string(),
        ));
    }
    Ok(())
}

fn is_loaded(domain: &str, label: &str) -> Result<bool, AppError> {
    Ok(launchctl::list_loaded(domain)?
        .iter()
        .any(|service| service.label == label))
}

fn verify_loaded(domain: &str, label: &str, expected: bool) -> Result<(), AppError> {
    if is_loaded(domain, label)? != expected {
        return Err(AppError::Launchctl(format!(
            "The command succeeded, but {domain}/{label} was not {}. Its owner may have changed its registration.",
            if expected { "loaded" } else { "unloaded" }
        )));
    }
    Ok(())
}

#[tauri::command]
pub async fn enable_job(
    label: String,
    plist_path: String,
    source: JobSource,
) -> Result<bool, AppError> {
    ensure_toggle_allowed(&plist_path, &source)?;
    let (_, actual_label) = control_target(&plist_path, false)?;
    if label != actual_label {
        return Err(AppError::Launchctl(
            "Label does not match the selected service.".to_string(),
        ));
    }
    launchctl::enable(&domain_for_source(&source), &label)?;
    let enabled = verified_enabled_state(&source, &label, &plist_path)?;
    if !enabled {
        return Err(AppError::Launchctl(format!(
            "launchctl enable succeeded, but '{label}' is still disabled when read back. Another process may have changed its enabled override."
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
    let (_, actual_label) = control_target(&plist_path, false)?;
    if label != actual_label {
        return Err(AppError::Launchctl(
            "Label does not match the selected service.".to_string(),
        ));
    }
    launchctl::disable(&domain_for_source(&source), &label)?;
    let enabled = verified_enabled_state(&source, &label, &plist_path)?;
    if enabled {
        return Err(AppError::Launchctl(format!(
            "launchctl disable succeeded, but '{label}' is still enabled when read back. Another process may have changed its enabled override."
        )));
    }
    Ok(enabled)
}

#[derive(serde::Serialize)]
pub struct RuntimeInfo {
    is_app_store: bool,
    is_administrator: bool,
    can_restart_as_administrator: bool,
    review_demo: bool,
}

#[tauri::command]
pub async fn get_runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        is_app_store: cfg!(feature = "app-store"),
        is_administrator: !cfg!(feature = "app-store") && launchctl::is_administrator(),
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
        "Unavailable in the Mac App Store edition: administrator access is not supported."
            .to_string(),
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
    ensure_user_agent(&plist_path)?;
    plist_util::write_plist(&plist_path, &config)
}

#[tauri::command]
pub async fn create_job(label: String, config: PlistConfig) -> Result<String, AppError> {
    let agents_dir = plist_util::get_user_agents_dir()?;
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
    ensure_user_agent(&plist_path)?;
    plist_util::write_raw_plist(&plist_path, &xml)
}

#[tauri::command]
pub async fn delete_job(plist_path: String, label: String) -> Result<(), AppError> {
    ensure_user_agent(&plist_path)?;
    let (domain, actual_label) = control_target(&plist_path, true)?;
    if label != actual_label {
        return Err(AppError::Launchctl(
            "Label does not match the selected service.".to_string(),
        ));
    }
    launchctl::bootout(&domain, &label)?;
    verify_loaded(&domain, &label, false)?;
    launchctl::disable(&domain, &label)?;
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
    crate::user_paths::home_dir()?
        .to_str()
        .map(String::from)
        .ok_or_else(|| AppError::Launchctl("Home directory is not valid UTF-8.".to_string()))
}

#[tauri::command]
pub async fn reveal_in_finder(path: String) -> Result<(), AppError> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()?;
    Ok(())
}

#[tauri::command]
pub async fn open_project_page() -> Result<(), AppError> {
    let output = std::process::Command::new("/usr/bin/open")
        .arg("https://github.com/webmaxru/Launchpane")
        .output()?;
    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "Could not open the project page: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        )));
    }
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
    fn test_library_agents_are_controllable_in_own_gui_domain() {
        assert_eq!(
            ensure_toggle_allowed(
                "/Library/LaunchAgents/com.example.plist",
                &JobSource::SystemAgent
            )
            .is_ok(),
            !cfg!(feature = "app-store")
        );
        assert!(
            ensure_toggle_allowed(
                "/Library/LaunchAgents/com.example.plist",
                &JobSource::SystemDaemon
            )
            .is_err()
        );
    }

    #[test]
    fn test_daemon_changes_require_root() {
        let result = ensure_toggle_allowed(
            "/Library/LaunchDaemons/com.example.plist",
            &JobSource::SystemDaemon,
        );
        assert_eq!(
            result.is_ok(),
            !cfg!(feature = "app-store") && launchctl::is_administrator()
        );
    }

    #[test]
    fn test_store_control_boundaries() {
        for source in [
            JobSource::UserAgent,
            JobSource::SystemAgent,
            JobSource::SystemDaemon,
            JobSource::LoginItem,
        ] {
            for lifecycle in [false, true] {
                let blocked = cfg!(feature = "app-store")
                    && (matches!(source, JobSource::SystemAgent | JobSource::SystemDaemon)
                        || (source == JobSource::LoginItem && lifecycle));
                assert_eq!(
                    ensure_store_control_allowed(&source, lifecycle).is_err(),
                    blocked
                );
            }
        }
    }

    #[test]
    fn test_runtime_info_reports_distribution() {
        let info = tauri::async_runtime::block_on(get_runtime_info());
        assert_eq!(info.is_app_store, cfg!(feature = "app-store"));
        assert_eq!(info.can_restart_as_administrator, !info.is_app_store);
        if info.is_app_store {
            assert!(!info.is_administrator);
            assert!(!info.review_demo);
        }
    }

    #[test]
    #[cfg(feature = "app-store")]
    fn test_store_commands_reject_shared_changes_before_accessing_files() {
        tauri::async_runtime::block_on(async {
            for (source, path) in [
                (
                    JobSource::SystemAgent,
                    "/Library/LaunchAgents/com.launchpane.not-real.plist",
                ),
                (
                    JobSource::SystemDaemon,
                    "/Library/LaunchDaemons/com.launchpane.not-real.plist",
                ),
            ] {
                let results = [
                    start_job(path.to_string()).await,
                    stop_job(path.to_string()).await,
                    restart_job(path.to_string()).await,
                    kickstart_job("not-real".to_string(), path.to_string()).await,
                    enable_job("not-real".to_string(), path.to_string(), source.clone())
                        .await
                        .map(|_| ()),
                    disable_job("not-real".to_string(), path.to_string(), source)
                        .await
                        .map(|_| ()),
                ];
                for result in results {
                    assert!(
                        result
                            .unwrap_err()
                            .to_string()
                            .contains("Mac App Store edition")
                    );
                }
            }
            for result in [
                stop_job(LOGIN_ITEM_PATH.to_string()).await,
                restart_job(LOGIN_ITEM_PATH.to_string()).await,
                kickstart_job("not-real".to_string(), LOGIN_ITEM_PATH.to_string()).await,
            ] {
                assert!(
                    result
                        .unwrap_err()
                        .to_string()
                        .contains("Mac App Store edition")
                );
            }
        });
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

    #[test]
    #[ignore = "Requires authenticated root execution and the original user's HOME and LAUNCHPANE_USER_UID"]
    fn real_administrator_feature_check() {
        assert!(
            launchctl::is_administrator(),
            "Run this opt-in test as root"
        );
        assert_ne!(
            launchctl::gui_domain(),
            "gui/0",
            "Preserve the original user's GUI domain"
        );
        tauri::async_runtime::block_on(async {
            for (directory, source) in [
                ("/Library/LaunchDaemons", JobSource::SystemDaemon),
                ("/Library/LaunchAgents", JobSource::SystemAgent),
            ] {
                let label = format!(
                    "com.launchpane.admincheck.{}.{}",
                    std::process::id(),
                    if source == JobSource::SystemDaemon {
                        "daemon"
                    } else {
                        "agent"
                    }
                );
                let path = format!("{directory}/{label}.plist");
                assert!(
                    !std::path::Path::new(&path).exists(),
                    "Refusing to overwrite an existing file"
                );
                let domain = domain_for_source(&source);
                struct Cleanup(String, String, String);
                impl Drop for Cleanup {
                    fn drop(&mut self) {
                        if let Err(error) = launchctl::bootout(&self.0, &self.1) {
                            eprintln!("Administrator fixture bootout cleanup failed: {error}");
                        }
                        if let Err(error) = launchctl::enable(&self.0, &self.1) {
                            eprintln!("Administrator fixture enable cleanup failed: {error}");
                        }
                        if std::path::Path::new(&self.2).exists() {
                            std::fs::remove_file(&self.2)
                                .expect("Administrator fixture plist cleanup failed");
                        }
                    }
                }
                let _cleanup = Cleanup(domain.clone(), label.clone(), path.clone());
                let mut config = cfg(Some("/bin/sleep"), Some(vec!["/bin/sleep", "60"]));
                config.label = label.clone();
                config.run_at_load = Some(false);
                config.keep_alive = Some(false);
                plist_util::write_plist(&path, &config).unwrap();
                use std::os::unix::fs::PermissionsExt;
                std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o644)).unwrap();
                assert!(
                    enable_job(label.clone(), path.clone(), source.clone())
                        .await
                        .unwrap()
                );
                start_job(path.clone()).await.unwrap();
                assert_eq!(
                    get_job_detail(path.clone()).await.unwrap().status,
                    JobStatus::Loaded
                );
                kickstart_job(label.clone(), path.clone()).await.unwrap();
                let pid = get_job_detail(path.clone()).await.unwrap().pid.unwrap();
                assert!(
                    !disable_job(label.clone(), path.clone(), source.clone())
                        .await
                        .unwrap()
                );
                assert_eq!(get_job_detail(path.clone()).await.unwrap().pid, Some(pid));
                restart_job(path.clone()).await.unwrap();
                assert_ne!(
                    get_job_detail(path.clone()).await.unwrap().pid.unwrap(),
                    pid
                );
                let jobs = list_jobs().await.unwrap();
                let job = jobs.iter().find(|job| job.plist_path == path).unwrap();
                assert_eq!(job.source, source);
                assert_eq!(job.status, JobStatus::Running);
                assert!(!job.enabled);
                assert!(save_job(path.clone(), config.clone()).await.is_err());
                assert!(
                    save_raw_plist(path.clone(), "<plist/>".to_string())
                        .await
                        .is_err()
                );
                assert!(delete_job(path.clone(), label.clone()).await.is_err());
                assert_eq!(
                    get_job_detail(path.clone()).await.unwrap().status,
                    JobStatus::Running
                );
                stop_job(path.clone()).await.unwrap();
                assert_eq!(
                    get_job_detail(path.clone()).await.unwrap().status,
                    JobStatus::Unloaded
                );
                assert!(start_job(path.clone()).await.is_err());
                assert!(restart_job(path.clone()).await.is_err());
                assert!(kickstart_job(label.clone(), path.clone()).await.is_err());
                enable_job(label.clone(), path.clone(), source)
                    .await
                    .unwrap();
                start_job(path.clone()).await.unwrap();
                stop_job(path.clone()).await.unwrap();
                eprintln!(
                    "Verified administrator lifecycle, enablement, inventory/detail and protected-file rejection for {domain}/{label}."
                );
            }
        });
    }

    #[test]
    #[ignore = "Creates and removes a disposable user agent on this Mac"]
    fn real_native_feature_check() {
        tauri::async_runtime::block_on(async {
            let label = format!("com.launchpane.commandcheck.{}", std::process::id());
            let path = plist_util::get_user_agents_dir()
                .unwrap()
                .join(format!("{label}.plist"));
            assert!(!path.exists(), "Refusing to overwrite an existing agent");
            let path = path.to_str().unwrap().to_string();
            struct Cleanup(String, String);
            impl Drop for Cleanup {
                fn drop(&mut self) {
                    let domain = launchctl::gui_domain();
                    if let Err(error) = launchctl::bootout(&domain, &self.1) {
                        eprintln!("Fixture bootout cleanup failed: {error}");
                    }
                    if let Err(error) = launchctl::enable(&domain, &self.1) {
                        eprintln!("Fixture enable cleanup failed: {error}");
                    }
                    if std::path::Path::new(&self.0).exists() {
                        std::fs::remove_file(&self.0).expect("Fixture plist cleanup failed");
                    }
                }
            }
            let _cleanup = Cleanup(path.clone(), label.clone());
            let logs = tempfile::tempdir().unwrap();
            let log_path = logs.path().join("stdout.log").to_str().unwrap().to_string();
            let mut config = cfg(Some("/bin/sleep"), Some(vec!["/bin/sleep", "60"]));
            config.label = label.clone();
            config.run_at_load = Some(false);
            config.keep_alive = Some(false);
            config.standard_out_path = Some(log_path.clone());
            assert_eq!(
                create_job(label.clone(), config.clone()).await.unwrap(),
                path
            );
            save_job(path.clone(), config).await.unwrap();
            let detail = get_job_detail(path.clone()).await.unwrap();
            assert_eq!(detail.source, JobSource::UserAgent);
            assert_eq!(detail.status, JobStatus::Unloaded);
            save_raw_plist(path.clone(), detail.plist.raw_xml)
                .await
                .unwrap();
            assert!(
                enable_job(
                    "wrong.label".to_string(),
                    path.clone(),
                    JobSource::UserAgent
                )
                .await
                .is_err()
            );
            assert!(
                enable_job(label.clone(), path.clone(), JobSource::SystemDaemon)
                    .await
                    .is_err()
            );
            assert!(
                enable_job(label.clone(), path.clone(), JobSource::UserAgent)
                    .await
                    .unwrap()
            );
            start_job(path.clone()).await.unwrap();
            assert_eq!(
                get_job_detail(path.clone()).await.unwrap().status,
                JobStatus::Loaded
            );
            assert!(start_job(path.clone()).await.is_err());
            kickstart_job(label.clone(), path.clone()).await.unwrap();
            let pid = get_job_detail(path.clone()).await.unwrap().pid.unwrap();
            assert!(
                !disable_job(label.clone(), path.clone(), JobSource::UserAgent)
                    .await
                    .unwrap()
            );
            let entries = list_jobs().await.unwrap();
            let entry = entries.iter().find(|entry| entry.label == label).unwrap();
            assert_eq!(entry.status, JobStatus::Running);
            assert!(!entry.enabled);
            restart_job(path.clone()).await.unwrap();
            assert_ne!(
                get_job_detail(path.clone()).await.unwrap().pid.unwrap(),
                pid
            );
            stop_job(path.clone()).await.unwrap();
            assert_eq!(
                get_job_detail(path.clone()).await.unwrap().status,
                JobStatus::Unloaded
            );
            assert!(start_job(path.clone()).await.is_err());
            assert!(restart_job(path.clone()).await.is_err());
            assert!(kickstart_job(label.clone(), path.clone()).await.is_err());
            enable_job(label.clone(), path.clone(), JobSource::UserAgent)
                .await
                .unwrap();
            start_job(path.clone()).await.unwrap();
            std::fs::write(&log_path, "first\nsecond\nthird\n").unwrap();
            let log = read_log_file(log_path.clone(), Some(2)).await.unwrap();
            assert_eq!(log.content, "second\nthird");
            assert!(log.modified_at.is_some());
            clear_log_file(log_path.clone()).await.unwrap();
            assert_eq!(read_log_file(log_path, None).await.unwrap().content, "");
            for entry in entries
                .iter()
                .filter(|entry| entry.source == JobSource::SystemDaemon)
            {
                let detail = get_job_detail(entry.plist_path.clone()).await.unwrap();
                let loaded = launchctl::list_loaded("system").unwrap();
                assert_eq!(
                    detail.status == JobStatus::Unloaded,
                    !loaded.iter().any(|s| s.label == entry.label)
                );
            }
            delete_job(path.clone(), label.clone()).await.unwrap();
            assert!(!std::path::Path::new(&path).exists());
            assert!(
                !list_jobs()
                    .await
                    .unwrap()
                    .iter()
                    .any(|entry| entry.label == label)
            );
            eprintln!(
                "Verified native inventory/detail, create/save/raw edit, label/source guards, lifecycle, enable/disable, log read/tail/clear, daemon-domain status, and removal on macOS."
            );
        });
    }
}
