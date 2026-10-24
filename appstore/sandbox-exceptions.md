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

- `~/Library/LaunchAgents` for personal agents and create/edit.
- `/Library/LaunchAgents` and `/Library/LaunchDaemons` for read-only inventory.
- `/Applications` and/or `~/Applications` for login-helper discovery.
- A log's containing folder to read or clear that log.

Use Command-Shift-G in the picker to enter a hidden Library path. Launchpane
remembers each chosen folder as an app-scoped security-scoped bookmark
(`com.apple.security.files.bookmarks.app-scope`) in
`Library/Application Support/com.webmaxru.launchpane/folder-access.plist` inside
its own sandbox container, and re-opens those bookmarks at the next launch. The
file holds only opaque bookmark blobs, not a path that is used as permission:
macOS decides whether each one still grants access. Bookmarks that no longer
resolve (folder deleted, moved or no longer readable) are dropped silently and
the folder must be chosen again. **Forget folders** stops access and deletes the
file. No unselected inventory root is scanned. With no remembered folder the app
shows a first-run card with **Choose folders…** and **Retry** rather than an
apparently complete empty inventory. Canceling the picker does not change grants
or refresh the inventory. If macOS cannot save a bookmark, the folder stays
accessible until the app quits and the error says so.
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

The Store edition requests exactly four entitlements, each tied to shipped
functionality and enforced by the justification map in
`scripts/verify-store-entitlements.py`:

| Entitlement | Functionality | Evidence |
| --- | --- | --- |
| `com.apple.security.app-sandbox` | Required for Mac App Store distribution | Store requirement |
| `com.apple.security.network.client` | Tauri's WKWebView content process loads the bundled UI | Removing it gives a blank window in a sandboxed build (macOS 12.7.6, October 16, 2026) |
| `com.apple.security.files.user-selected.read-write` | Native folder consent for inventory/logs; personal plist create/edit | Folder-consent QA in [review-recording.md](review-recording.md) |
| `com.apple.security.files.bookmarks.app-scope` | Remembers the folders chosen in the picker across relaunches | Apple documents it as the entitlement for app-scoped security-scoped bookmarks; see the removal-test note below |

**Bookmark entitlement removal test (macOS 12.7.6, ad-hoc signed, sandboxed).**
With the entitlement, a folder chosen in the picker was restored after quitting
and relaunching with no prompt. The same app re-signed without
`bookmarks.app-scope` also created, saved and restored bookmarks across a
relaunch, so this machine does not enforce the entitlement and the test cannot
show what removing it breaks. It is kept because Apple documents it as required
for security-scoped bookmarks and enforcement may differ on other macOS versions
and with distribution signing. Confirm persistence on the exact TestFlight build
before submission. Do not interpret this older-OS removal result as proof that
Apple's documented entitlement can safely be omitted on supported macOS
versions. The October 24 candidate retains it for the concrete bookmark
feature, not for hypothetical framework behavior. Apple's
[security-scoped bookmark guidance](https://developer.apple.com/documentation/professional-video-applications/enabling-security-scoped-bookmark-and-url-access)
explicitly lists the app-scope entitlement. The removal result remains
inconclusive rather than being relabeled a pass.

`com.apple.security.network.server` is forbidden. Launchpane never listens for
incoming connections; App Review rejected 1.3.3 for requesting it without
matching functionality. A client-only sandboxed build renders and behaves
identically. Launchpane makes no outbound requests of its own; its service data
stays local.

Signing adds only `com.apple.application-identifier` and
`com.apple.developer.team-identifier`, derived from the matching distribution
profile. `scripts/verify-store-entitlements.py` validates the source entitlement
file, generated signing entitlements and final executable entitlements.
Unknown or unjustified entitlements, `network.server`, temporary file
exceptions, and either value of the debugging entitlement fail validation.

These changes address the reported entitlement configuration, not a guarantee
of approval. They must pass exact distribution-build QA before resubmission.
References: [QA1773](https://developer.apple.com/library/archive/qa/qa1773/_index.html)
and [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).
