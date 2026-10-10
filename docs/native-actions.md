# Standalone macOS action availability

This document applies to the **direct-download, non-App-Store build**. It describes
the actual table controls and their native launchd operations, not sandboxed
App Store capabilities.

## Visibility policy

An action is **hidden** only when it has no supported implementation for that
item type, or is deliberately outside Launchpane's file-editing boundary.
An action is **visible but disabled** when the type supports it but the current
privilege, service state, or an in-flight operation prevents it. Disabled menu
items include the reason as readable text and an accessible description; the
primary button includes the reason in its tooltip.

The row has one compact primary action: **Stop** for running services, **Run now**
for loaded services, and **Load** for unloaded plist-backed services. Its overflow
menu exposes all applicable lifecycle actions and **both Enable and Disable**,
including actions currently disabled. An unloaded login item has no primary
action because only its parent app can register it again.

## Item types and privileges

The source directory does **not** by itself determine the launchd privilege
boundary. A root-owned plist and a root-owned launchd domain are different things.

| Item shown in the table | Domain inspected and controlled | Ordinary app window | Administrator window | File operations |
| --- | --- | --- | --- | --- |
| User Agent: `~/Library/LaunchAgents/*.plist` | `gui/<original-user-uid>` | Load, run, restart, unload, enable, disable, subject to the state table below | Same operations in the **original user's GUI domain**, not root's GUI domain | Edit and Remove supported; ordinary filesystem permissions still apply |
| System Agent: `/Library/LaunchAgents/*.plist` | `gui/<original-user-uid>` | Load, run, restart, unload, enable, disable for **this user's session**; root is not inherently required for these launchctl operations | Same operations for the original user's session; does not change other users' sessions | Edit and Remove hidden, including in administrator mode: shared/vendor-owned configuration is intentionally not rewritten or deleted |
| System Daemon: `/Library/LaunchDaemons/*.plist` | `system` | Lifecycle and enable/disable controls are visible but disabled: **Open Administrator Window** | Load, run, restart, unload, enable, disable, subject to state and macOS restrictions | Edit and Remove hidden even as administrator; controlling a shared service is not permission to delete its configuration |
| Login Item: `<App>.app/Contents/Library/LoginItems/<Helper>.app` | `gui/<original-user-uid>` | Run, restart, unload when registered; enable and disable overrides | Same operations in the original user's GUI domain | Load, Edit, Remove and plist-based Logs hidden: the helper has no standalone launchd plist |

“Administrator” means the app process is actually running as root, not merely
that the signed-in account belongs to the `admin` group. The standalone build's
**Open Administrator Window** requests authentication through macOS and preserves
the originating user's UID and home directory for user-agent operations.

These controls cover discovered third-party `/Library` services and user services.
Apple's `/System/Library/LaunchAgents` and `/System/Library/LaunchDaemons` are not
included in this inventory. Administrator mode is not a bypass for System
Integrity Protection, launchd restrictions, managed-device policy, or modern
macOS background-item approval.

## Complete action and condition table

Permission restrictions above apply before the state restrictions below.
All visible mutations are disabled while another mutation is being executed
and verified, including actions on other rows. View details and Reveal remain
available on other rows.

| Action | Native operation / effect | Enabled when | Visible but disabled: full reason and recovery | Hidden when / why |
| --- | --- | --- | --- | --- |
| **Load** | `launchctl bootstrap <domain> <plist>`; register the plist. `RunAtLoad`, `KeepAlive`, or other launch conditions may immediately create a process | Plist-backed service is **Unloaded** and its effective enabled state is **true** | Loaded/Running: already registered; use Run now or Restart. Disabled: Enable first. Enabled state unknown: Refresh or Enable to establish it. Status Unknown: Refresh. Daemon in ordinary window: authenticate as administrator. Busy: wait for verification | Login Item: no standalone launchd plist; its parent app must register the helper |
| **Run now** | `launchctl kickstart <domain>/<label>`; request execution without changing the plist or enabled override. Does **not** use `-k` | Service is **Loaded**, including a loaded-but-disabled service | Running: already executing; use Restart to terminate and replace the instance. Unloaded plist: Load first. Unloaded helper: register through the parent app. Status Unknown: Refresh. Daemon without administrator: authenticate. Busy: wait | Not hidden for any discovered item type |
| **Restart** | `launchctl kickstart -k <domain>/<label>`; terminate any current instance and request a fresh invocation, preserving registration | Service is **Loaded or Running**, including when disabled | Unloaded: must be registered first; Load a plist or use the login item's parent app. Status Unknown: Refresh. Daemon without administrator: authenticate. Busy: wait | Not hidden for any discovered item type |
| **Stop / Unload** | `launchctl bootout <domain>/<label>`; unregister the service and terminate its process if running. Does **not** change enablement or delete any file | Service is **Loaded or Running**, including when disabled. A loaded idle service can be unloaded too | Unloaded: already unregistered, no process to stop through this registration. Status Unknown: Refresh. Daemon without administrator: authenticate. Busy: wait | Not hidden for any discovered item type. For login items a confirmation warns that **Enable cannot reload the helper**; its parent app must register it again |
| **Enable** | `launchctl enable <domain>/<label>`; persist an enabled override. Does **not** load or start the service immediately | Effective enabled state is **false or unknown**, irrespective of runtime state | Enabled: already enabled. Daemon without administrator: authenticate. Busy: wait. Unknown runtime status alone does not block changing the override | Not hidden for any discovered item type |
| **Disable** | `launchctl disable <domain>/<label>`; persist a disabled override. Does **not** stop, unload, or prevent kickstarting an already registered service | Effective enabled state is **true or unknown**, irrespective of runtime state | Disabled: already disabled. Daemon without administrator: authenticate. Busy: wait. Use Stop/Unload separately if it must stop now | Not hidden for any discovered item type |
| **View details** | Read configuration and launchd state; for a login item, read its helper bundle metadata instead of a nonexistent launchd plist | Available when the row is not the item currently being changed | This row's mutation is pending: wait for the resulting state. A read failure is shown rather than presenting stale details as current | Never hidden |
| **Edit** (detail sheet) | Open the plist form; save to the same user-agent path | User Agent details are loaded | The form's own validation/saving rules apply; invalid XML or filesystem failures are reported. Editing does not automatically reload a registered service: Unload, then Load to apply a new launchd configuration | System Agent/Daemon: intentional shared-file protection, even as root. Login Item: no standalone launchd plist to edit |
| **Remove agent** | Unload, verify absence, set disabled override, then delete the user-agent plist after confirmation | User Agent, no pending mutation; does not require the agent to be loaded or enabled | Busy: wait. Filesystem and launchctl errors are reported; a failure can leave the file present after an earlier unload or disable succeeded | System Agent/Daemon: intentionally protected shared configuration. Login Item: removing its helper would modify another app's bundle |
| **Reveal in Finder** | Select the plist file or helper bundle in Finder | Available when the row's action menu is available | That row's action menu is unavailable during its pending mutation. Missing paths or Finder failures can still occur when executing the command | Never hidden |
| **Logs** (detail tab) | Read configured stdout/stderr paths, show a tail, clear a selected file, or open it in an editor | Plist-backed item with the relevant configured log path and filesystem access | No path: no log file to display. Missing/unreadable files, invalid text, permission failures, or a writer replacing the file are execution-time errors; administrator access may help with a root-owned log | Login Item: no plist-declared log paths are available; this does not claim that the helper has no logs elsewhere |

## Dependencies that matter

- **Enabled, Loaded, and Running are independent axes.** Enable is permission
  for future registration, Loaded means registered, and Running means an active
  process exists. Enabling is not loading. Loading is not a guarantee of an
  active process. Disabling is not stopping.
- **Unloaded + Disabled:** Enable, then Load, then Run now if it did not
  automatically start. For a login item, replace Load with registration through
  its parent application's settings.
- **Loaded/Running + Disabled:** it can still run or restart. Unload if it must
  stop and stay unregistered. Subsequent Load is blocked until Enable succeeds.
- **Stop means unregister, not just send SIGTERM.** A SIGTERM-only operation can
  immediately respawn a `KeepAlive` service and leave its schedules active.
  Bootout removes the registration instead. An external owner can still register
  it again; disable separately if future registration should be blocked.
- **Restart does not re-read the plist.** It restarts the current registration
  using `kickstart -k`. To apply saved plist changes, Unload and Load.
- **An enabled scheduled agent that is unloaded is not monitoring its schedule.**
  The schedule belongs to its registered launchd job, not to the enabled override.
- **The launchctl override takes precedence over the plist's `Disabled` key.**
  With no override, that key is the default; with neither, the default is enabled.
- **Privileges are necessary, not sufficient.** Bootstrap can still reject a
  malformed or incompatible plist, an inaccessible executable, an unavailable
  session, or a service restricted by macOS. Such failures are shown; the app
  does not enable services silently or switch domains to make an action succeed.
- **Labels identify services within a domain.** If a user plist and a shared GUI
  plist declare the same label, their rows refer to the same launchd registration
  and enabled override, not two independent processes. Only one can be loaded
  under that label in the GUI domain.
- **Run/Restart success means the request was accepted and registration read
  back.** Short-lived services may already have exited before refresh. It does
  not mean their program exited successfully; inspect PID, exit status and logs.

## Real-Mac verification and limits

The behavior was checked on **macOS Monterey 12.7.6, build 21H1320**, with an
ordinary GUI session. The signed-in account is in the `admin` group, but the
app/test process has a non-root UID; `sudo -n` requires a password.

Live tests use disposable services, not the user's existing agents or vendor
helpers. They exercise GUI-domain registration, immediate run, restart, disable
while running, unload, disabled-bootstrap rejection, re-enable and reload.
Native command tests also cover creation, structured/raw saves, inventory and
detail, label/source checks, log tail/read/clear, system-domain status inspection,
and removal. Frontend tests cover the full source/status/enabled/privilege matrix.
The standalone release `.app` was built and launched on this Mac; its native
window displayed the real inventory and conditionally disabled primary controls.

### Authenticated administrator-window check

The standalone app was authenticated through macOS and its process was verified
to have UID **0**, with an **Administrator** badge visible in the native window.
Using that real window, a disposable user-agent fixture was loaded, run,
restarted, disabled while running, restarted while disabled, unloaded, re-enabled,
loaded again and removed. Independent `launchctl print gui/501/<fixture>` checks
confirmed registration, running PIDs, PID replacement and final removal.
`print-disabled gui/501` confirmed the override transitions. Enable alone did
not register the fixture. The fixture's plist and process were removed afterward.

This verifies that an administrator window still controls the **original user's
GUI domain**, rather than silently targeting `gui/0`. Its action menu was also
checked for a real disabled/unloaded daemon: **Enable** is available, while Load
requires enablement and Run/Restart/Unload require registration. Shared-file
Edit/Remove remain absent. Inspecting that menu exposed a native-window overflow:
expanded reason text now uses a measured height limit based on the space above
or below its trigger inside the viewport, capped at 70% viewport height. The menu
opens on the roomier side, scrolls within that limit, and retains an 8-pixel
collision inset rather than relying solely on WebKit's document-scroll geometry.
The rebuilt native binary was checked in a 1000-by-700 window: the menu measured
320-by-350 and stayed inside the visible window. The currently running,
already-authenticated window must be relaunched to pick up rebuilt UI assets.

| Administrator-window check | Result |
| --- | --- |
| macOS authentication, root process and Administrator badge | Verified on this Mac |
| User-agent Load / Run / Restart / Stop-Unload / Enable / Disable / Remove through the real UI | Verified with a disposable GUI-domain fixture |
| Disable preserves an existing process; disabled registration can restart | Verified through the real UI and independent launchctl reads |
| Enable does not load; disabled/unloaded runtime actions stay disabled | Verified through the real UI and action-state tests |
| Daemon controls become privilege-eligible; state restrictions still apply | Verified by inspecting the real administrator menu and action-state tests; no vendor daemon was changed |
| Root-only daemon lifecycle execution | **Not executed yet:** the separate native test runner requires another macOS authorization; app authentication does not grant root to the agent's shell |
| Shared plist Edit/Remove rejection, even as root | UI visibility and ordinary backend guard tests verified; root execution is included in the pending opt-in administrator test |

Root-only daemon **mutations remain unverified end-to-end** until the separately
authenticated test runner is approved. Its fixture creates unique, temporary
`com.launchpane.admincheck.<pid>.daemon` and `.agent` plists in `/Library`,
exercises lifecycle and override transitions, rejects shared-file edits/removal,
then cleans up those fixtures. No existing vendor or Apple service is used.
The test is named `real_administrator_feature_check` and is deliberately ignored
by the ordinary Rust suite. Run it only through explicit root authorization,
preserving the original user's `HOME` and `LAUNCHPANE_USER_UID`; never run an
entire dependency installation/build as root to obtain that authorization.

Daemon `system` domain routing, privilege rejection and action-state policy are
covered by code/tests. Existing
login helpers are not stopped or re-registered merely to test the UI: their
runtime controls use the same GUI-domain service-target commands verified with
disposable services, but parent-app re-registration is app-specific. Newer
macOS ServiceManagement approval behavior is not established by a Monterey test.

To repeat the intentionally opt-in live tests:

```bash
RUSTUP_HOME="$HOME/.rustup" cargo test --manifest-path src-tauri/Cargo.toml real_ -- --ignored --nocapture --test-threads=1 --skip real_administrator_feature_check
```

The fixtures remove their processes, temporary plist files and logs. Exercising
enable/disable leaves enabled (`false` in `print-disabled`) overrides for their
unique `com.launchpane.*check.<pid>` labels (and the GUI-window fixture's
`com.launchpane.adminuicheck.20261010` label) in launchd's persistent override
database; no existing service overrides are changed. The tests do not reset the
whole database to remove those entries, since that would affect real services.

The local reference for domain ownership and these operations is `man launchctl`,
plus `launchctl help bootstrap`, `launchctl help kickstart`, and
`launchctl help disable`. `launchctl print <domain>` is a diagnostic text format;
the domain parser has regression fixtures and was exercised against this Mac,
but output changes on another macOS release require revalidation. Missing the
expected services section is reported as an error, not a falsely empty inventory.
