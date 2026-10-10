use crate::error::AppError;
use std::collections::HashMap;
use std::process::Command;

pub fn effective_uid() -> u32 {
    // Use getuid() via libc-free approach
    let output = Command::new("id")
        .arg("-u")
        .output()
        .expect("failed to get uid");
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u32>()
        .expect("failed to parse uid")
}

pub fn is_administrator() -> bool {
    effective_uid() == 0
}

fn user_uid() -> u32 {
    std::env::var("LAUNCHPANE_USER_UID")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or_else(effective_uid)
}

pub fn gui_domain() -> String {
    format!("gui/{}", user_uid())
}

fn service_target(domain: &str, label: &str) -> String {
    format!("{domain}/{label}")
}

#[derive(Debug)]
pub struct LoadedService {
    pub label: String,
    pub pid: Option<u32>,
    pub last_exit_code: Option<i32>,
}

#[cfg(test)]
pub fn parse_list_output(output: &str) -> Vec<LoadedService> {
    let mut services = Vec::new();
    for line in output.lines().skip(1) {
        // skip header
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 3 {
            continue;
        }
        let pid = parts[0].trim().parse::<u32>().ok();
        let exit_code = parts[1].trim().parse::<i32>().ok();
        let label = parts[2].trim().to_string();
        if label.is_empty() {
            continue;
        }
        services.push(LoadedService {
            label,
            pid,
            last_exit_code: exit_code,
        });
    }
    services
}

pub fn parse_domain_output(output: &str) -> Vec<LoadedService> {
    let mut in_services = false;
    let mut services = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line == "services = {" {
            in_services = true;
            continue;
        }
        if in_services && line == "}" {
            break;
        }
        if !in_services {
            continue;
        }
        let Some((pid, rest)) = line.split_once(char::is_whitespace) else {
            continue;
        };
        let Some((exit_code, label)) = rest.trim_start().split_once(char::is_whitespace) else {
            continue;
        };
        let Ok(pid) = pid.parse::<u32>() else {
            continue;
        };
        if label.trim().is_empty() {
            continue;
        }
        services.push(LoadedService {
            label: label.trim().to_string(),
            pid: (pid != 0).then_some(pid),
            last_exit_code: exit_code.parse().ok(),
        });
    }
    services
}

pub fn list_loaded(domain: &str) -> Result<Vec<LoadedService>, AppError> {
    let output = Command::new("launchctl")
        .args(["print", domain])
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to inspect {domain}: {e}")))?;

    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "launchctl print {domain} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.lines().any(|line| line.trim() == "services = {") {
        return Err(AppError::Launchctl(format!(
            "Unrecognized launchctl print format for {domain}; cannot verify service state."
        )));
    }
    Ok(parse_domain_output(&stdout))
}

pub fn parse_disabled_output(output: &str) -> HashMap<String, bool> {
    output
        .lines()
        .filter_map(|line| {
            let (label, value) = line.trim().split_once("=>")?;
            let label = label.trim().strip_prefix('"')?.strip_suffix('"')?;
            let disabled = match value.trim().trim_end_matches(',') {
                "true" => true,
                "false" => false,
                _ => return None,
            };
            Some((label.to_string(), disabled))
        })
        .collect()
}

pub fn list_disabled(domain: &str) -> Result<HashMap<String, bool>, AppError> {
    let output = Command::new("launchctl")
        .args(["print-disabled", domain])
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to run launchctl print-disabled: {e}")))?;

    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "launchctl print-disabled failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    Ok(parse_disabled_output(&String::from_utf8_lossy(
        &output.stdout,
    )))
}

pub fn bootstrap(domain: &str, plist_path: &str) -> Result<(), AppError> {
    let output = Command::new("launchctl")
        .args(["bootstrap", domain, plist_path])
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to run launchctl bootstrap: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        // "service already loaded" is not a fatal error
        if stderr.contains("already loaded") || stderr.contains("service already loaded") {
            return Ok(());
        }
        let hint = if stderr.contains("Input/output error") {
            " Try re-running the command as root for richer errors."
        } else {
            ""
        };
        return Err(AppError::Launchctl(format!(
            "Bootstrap failed for {plist_path}: {stderr}{hint}"
        )));
    }
    Ok(())
}

pub fn bootout(domain: &str, label: &str) -> Result<(), AppError> {
    let output = Command::new("launchctl")
        .args(["bootout", &service_target(domain, label)])
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to run launchctl bootout: {e}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // "not loaded" is not a fatal error
        if stderr.contains("not loaded")
            || stderr.contains("No such process")
            || stderr.contains("Could not find specified service")
        {
            return Ok(());
        }
        return Err(AppError::Launchctl(format!(
            "launchctl bootout failed: {stderr}"
        )));
    }
    Ok(())
}

pub fn kickstart(domain: &str, label: &str, restart: bool) -> Result<(), AppError> {
    let mut command = Command::new("launchctl");
    command.arg("kickstart");
    if restart {
        command.arg("-k");
    }
    let output = command
        .arg(service_target(domain, label))
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to run launchctl kickstart: {e}")))?;

    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "launchctl kickstart failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }
    Ok(())
}

pub fn enable(domain: &str, label: &str) -> Result<(), AppError> {
    let output = Command::new("launchctl")
        .args(["enable", &service_target(domain, label)])
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to run launchctl enable: {e}")))?;

    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "launchctl enable failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }
    Ok(())
}

pub fn disable(domain: &str, label: &str) -> Result<(), AppError> {
    let output = Command::new("launchctl")
        .args(["disable", &service_target(domain, label)])
        .output()
        .map_err(|e| AppError::Launchctl(format!("failed to run launchctl disable: {e}")))?;

    if !output.status.success() {
        return Err(AppError::Launchctl(format!(
            "launchctl disable failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_domain_output_scopes_services_and_handles_pid_zero() {
        let services = parse_domain_output(
            "system = {\n services = {\n 123 0 example.running\n 0 (pe) example.idle\n 0 - example.waiting\n }\n endpoints = {\n 999 0 not.a.service\n }\n}",
        );
        assert_eq!(services.len(), 3);
        assert_eq!(services[0].pid, Some(123));
        assert_eq!(services[0].last_exit_code, Some(0));
        assert_eq!(services[1].pid, None);
        assert_eq!(services[1].last_exit_code, None);
        assert_eq!(services[2].label, "example.waiting");
    }

    #[test]
    #[ignore = "Creates a disposable service in this Mac's GUI launchd domain"]
    fn real_gui_lifecycle() {
        let dir = tempfile::tempdir().unwrap();
        let label = format!("com.launchpane.featurecheck.{}", std::process::id());
        let domain = gui_domain();
        let path = dir.path().join("test.plist");
        let path = path.to_str().unwrap();
        std::fs::write(path, format!(
            "<?xml version=\"1.0\"?><!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\"><plist version=\"1.0\"><dict><key>Label</key><string>{label}</string><key>ProgramArguments</key><array><string>/bin/sleep</string><string>60</string></array><key>RunAtLoad</key><false/></dict></plist>"
        )).unwrap();
        struct Cleanup<'a>(&'a str, &'a str);
        impl Drop for Cleanup<'_> {
            fn drop(&mut self) {
                if let Err(error) = bootout(self.0, self.1) {
                    eprintln!("Fixture bootout cleanup failed: {error}");
                }
                if let Err(error) = enable(self.0, self.1) {
                    eprintln!("Fixture enable cleanup failed: {error}");
                }
            }
        }
        let _cleanup = Cleanup(&domain, &label);
        enable(&domain, &label).unwrap();
        bootstrap(&domain, path).unwrap();
        let service = || {
            list_loaded(&domain)
                .unwrap()
                .into_iter()
                .find(|s| s.label == label)
        };
        assert_eq!(service().unwrap().pid, None);
        kickstart(&domain, &label, false).unwrap();
        let pid = service().unwrap().pid.unwrap();
        disable(&domain, &label).unwrap();
        assert_eq!(list_disabled(&domain).unwrap().get(&label), Some(&true));
        assert_eq!(service().unwrap().pid, Some(pid));
        kickstart(&domain, &label, true).unwrap();
        assert_ne!(service().unwrap().pid.unwrap(), pid);
        bootout(&domain, &label).unwrap();
        assert!(service().is_none());
        assert!(bootstrap(&domain, path).is_err());
        enable(&domain, &label).unwrap();
        bootstrap(&domain, path).unwrap();
        assert!(service().is_some());
        bootout(&domain, &label).unwrap();
        assert!(service().is_none());
        eprintln!(
            "Verified GUI Load / Run / Restart / Disable while running / Unload / disabled Load rejection / Enable + Load."
        );
    }

    #[test]
    fn test_parse_list_output_basic() {
        let output = "PID\tStatus\tLabel\n\
                       1234\t0\tcom.example.running\n\
                       -\t78\tcom.example.stopped\n";
        let result = parse_list_output(output);
        assert_eq!(result.len(), 2);

        assert_eq!(result[0].label, "com.example.running");
        assert_eq!(result[0].pid, Some(1234));
        assert_eq!(result[0].last_exit_code, Some(0));

        assert_eq!(result[1].label, "com.example.stopped");
        assert_eq!(result[1].pid, None);
        assert_eq!(result[1].last_exit_code, Some(78));
    }

    #[test]
    fn test_parse_disabled_output() {
        let output = r#"disabled services = {
    "com.example.disabled" => true
    "com.example.enabled" => false
}
login item associations = {
    "com.example.enabled" => "com.example.app"
}"#;
        let result = parse_disabled_output(output);

        assert_eq!(result.get("com.example.disabled"), Some(&true));
        assert_eq!(result.get("com.example.enabled"), Some(&false));
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_parse_list_output_empty() {
        let output = "PID\tStatus\tLabel\n";
        let result = parse_list_output(output);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_parse_list_output_malformed_lines() {
        let output = "PID\tStatus\tLabel\n\
                       bad line\n\
                       1234\t0\tcom.example.test\n";
        let result = parse_list_output(output);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].label, "com.example.test");
    }
}
