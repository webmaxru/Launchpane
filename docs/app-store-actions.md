# Mac App Store edition: inspector and plist editor

The `app-store` build uses App Sandbox and is deliberately different from the
[standalone edition](native-actions.md). User authorization on October 15, 2026
permits removing unsupported Store functionality rather than submitting broken
controls. Both editions retain one marketing version and immutable release source.

## Edition comparison

| Capability | Store edition | Standalone edition |
| --- | --- | --- |
| Inventory, search, source filtering, state, schedules | Available for explicitly selected inventory folders | Automatic discovery in the normal locations |
| Inspect system/shared services and login helpers | Read-only | Read-only configuration; permitted service controls |
| Create/edit personal LaunchAgent plist | Available after selecting `~/Library/LaunchAgents`; saving does not activate/reload the service | Available |
| Load, Run now, Stop/Unload, Restart | Removed for every source; backend rejects direct IPC too | Available subject to state and permissions |
| Enable/Disable, including login helpers | Removed; backend rejects direct IPC too | Available subject to permissions |
| Remove agent | Removed; safe removal requires lifecycle control unavailable in the sandbox | Available with confirmation and cleanup |
| Administrator window | Removed; backend rejects it | Available with macOS authentication |
| Logs | Read, refresh, clear and open selected log files, subject to sandbox permissions | Normal filesystem permissions |
| Terminal commands | View/copy reference only, never execute | View/copy reference only |
| Development demo automation | Disabled | Development only |

The Store edition is independently useful for diagnosing startup configuration,
inspecting launchd state, reading logs, and preparing/editing user-owned plists.
It does not require the standalone edition. Saving a plist does not imply that
the app can register or activate it. Optional new-agent log paths start empty
to avoid creating an unselected `~/Library/Logs` folder.

## Native folder consent

Use **Choose folders…** to select LaunchAgents, LaunchDaemons, Applications or
log folders using NSOpenPanel. Command-Shift-G reaches hidden Library paths.
Only selected inventory roots are scanned; grants last until quit and must be
given again after reopening. Canceling changes nothing. There are no temporary
filesystem exceptions, saved-path permission bypasses or debug entitlements.

## UI edition notice and link assessment

The app says that the separately distributed standalone edition supports service
management and administrator workflows, but does not call it a paid upgrade or
“full version”. Its optional **Project documentation and source on GitHub** link
opens the system browser; the destination also contains standalone releases.
The Store app never downloads, installs, updates or unlocks another edition.
There is no purchase, license or external payment mechanism.

This wording documents a factual edition difference; it is not an approval
guarantee. Guidelines 2.2 and 4.2 still require a useful finished standalone
product, 2.3 requires accurate metadata, 2.4.5(i)/2.5.2 require sandbox boundaries,
2.4.5(v) prohibits root escalation, and 2.4.5(iv)/(vii) prohibit alternative
code installation/update mechanisms. If Apple objects to the edition reference,
remove the reference instead of disguising an external unlock funnel.

## Verification

Frontend tests exhaustively cover hidden Store actions across source, state,
enabled status and privilege combinations. Rust tests reject all six runtime
operations and removal before touching nonexistent fixture files, including
user agents and login helpers. Standalone tests preserve its normal controls.

The previous local sandbox preview could create a user-selected plist but
could not bootstrap it (error 5), while that plist loaded outside the sandbox.
The Store edition no longer invokes that unsupported workflow. New local
native QA, current screenshots and exact production-build TestFlight/physical
device QA remain separate release gates; see
[`review-recording.md`](../appstore/review-recording.md).
