# App Sandbox and user-selected access

## October 15, 2026 rejection

Apple rejected version 1.2.1 build `202610100953`, submission
`9249e9ef-0e6c-4043-9197-2bb9e2053b49`, under guideline 2.4.5(i).
The replacement source removes **all** temporary filesystem exceptions,
including the rejected shared LaunchAgents, LaunchDaemons, Applications and
home LaunchAgents paths. It also omits `com.apple.security.get-task-allow`
entirely. Do not change that key to `true`: distribution apps must not allow
debugging. A false value is also rejected by this submission's review.

## Native folder consent

The Store entitlement `com.apple.security.files.user-selected.read-write`
allows access granted through macOS `NSOpenPanel`. Choose **Choose folders…**
and explicitly select the folders to inspect:

- `~/Library/LaunchAgents` for personal agents and create/edit/remove.
- `/Library/LaunchAgents` and `/Library/LaunchDaemons` for read-only inventory.
- `/Applications` and/or `~/Applications` for login-helper discovery.
- A log's containing folder to read or clear that log.

Use Command-Shift-G in the picker to enter a hidden Library path. Grants last
for the current process only: choose folders again after quitting/reopening.
No path is saved and treated as permission; no unselected inventory root is
scanned. The app initially explains the missing permission rather than
presenting an apparently complete empty inventory. Canceling the picker does
not change grants or refresh the inventory.
New Store agents leave the optional log paths empty by default rather than
trying to create `~/Library/Logs/Launchpane` without consent. To enable logs,
select their containing folder and enter the desired paths explicitly.

Folder grants do not confer administrator privileges or launchd authorization.
All service control, enable/disable, removal and administrator operations are
removed from the Store UI and rejected by its backend. User-selected personal
plists can be created and edited but not activated. See the
[action table](../docs/app-store-actions.md) and
[exact-build QA gate](review-recording.md).

## Runtime and signing entitlements

`com.apple.security.app-sandbox`, `com.apple.security.network.client`,
`com.apple.security.network.server`, and user-selected read/write access are
Boolean true. The network entitlements support Tauri's embedded WebKit process
on supported older macOS; Launchpane's service data stays local.

Signing adds only `com.apple.application-identifier` and
`com.apple.developer.team-identifier`, derived from the matching distribution
profile. `scripts/verify-store-entitlements.py` validates the source entitlement
file, generated signing entitlements and final executable entitlements.
Unknown entitlements, temporary file exceptions, and either value of the
debugging entitlement fail validation.

These changes address the reported entitlement configuration, not a guarantee
of approval. They must pass exact distribution-build QA before resubmission.
References: [QA1773](https://developer.apple.com/library/archive/qa/qa1773/_index.html)
and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
