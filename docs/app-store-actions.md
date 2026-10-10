# Mac App Store action availability

This page covers the `app-store` build feature and
[`tauri.app-store.conf.json`](../src-tauri/tauri.app-store.conf.json), not the
[standalone edition](native-actions.md). The App Store edition is sandboxed,
has no root escalation, and retains the documented read-only boundary for
shared services. File exceptions do not grant launchd control rights.

## Edition-specific limits

Applicable actions stay visible but disabled, with the exact edition-specific
reason below. These reasons take precedence over temporary service state or an
in-progress operation; an App Store user is never told to open an administrator
window to resolve a permanent edition limit. Rust rejects the same operations,
including direct IPC requests and a Store-feature process launched as root.

| Item or surface | Action | App Store behavior | Explanation |
| --- | --- | --- | --- |
| Header | Open Administrator Window | Visible, disabled; keyboard-focusable hint | “Unavailable in the Mac App Store edition: administrator access is not supported.” |
| Shared `/Library/LaunchAgents` | Load, Run now, Stop/Unload, Restart, Enable, Disable | Visible, disabled in primary action and overflow menu | “Unavailable in the Mac App Store edition: shared agents and system daemons are read-only.” These GUI-domain controls are available without root in the standalone edition, but intentionally excluded from the Store edition. |
| `/Library/LaunchDaemons` | Load, Run now, Stop/Unload, Restart, Enable, Disable | Visible, disabled in primary action and overflow menu | The same shared-service explanation. Administrator access cannot be enabled in this edition. |
| Login helper | Run now, Stop/Unload, Restart | Visible, disabled wherever applicable | “Unavailable in the Mac App Store edition: login helpers support Enable and Disable only; their parent app manages their lifecycle.” |
| Login helper | Enable, Disable | Available subject to current enabled state and pending operation | Not an edition restriction. Enabling does not register or start a helper; disabling does not stop an existing process. Actual sandbox authorization must still be verified. |
| User agent | Load, Run now, Stop/Unload, Restart, Enable, Disable | Retained with the normal launchd state dependencies | Not deliberately disabled by the build channel. Actual launchd access is subject to App Sandbox enforcement. |
| User agent | Create, Edit, Remove | Retained | Uses the requested `~/Library/LaunchAgents/` write exception. Apple must approve this exception; compiling the feature is not evidence of sandbox access. |
| Shared services | Edit, Remove | Hidden in both editions | Protected configuration, not an App-Store-only limitation. Even standalone administrator mode does not edit/delete these plists. |
| Login helper | Load, Edit, Remove, Logs tab | Hidden in both editions | No standalone launchd plist or plist-declared logs. The parent app owns registration and the bundle. Not an App-Store-only limitation. |
| Detail Commands tab | View/copy Terminal command reference | Retained with an App Store explanation | The app does not execute these commands. Copying them grants no sandbox access and cannot enable administrator features. |
| Details/logs | Read logs, Clear log, Open in editor, Reveal in Finder | Not deliberately disabled by the build channel | Arbitrary log paths are not covered by the launch-agent file exceptions. Runtime permission failures are not proof of an intentionally disabled feature; they must remain explicit. |
| Automated review demo | Environment-triggered walkthrough | Compiled out of Store behavior | Development-only fixture automation, not a user feature. The submitted edition must be demonstrated using its actual inventory and controls. |

Other disabled states (already enabled/disabled, missing registration, unknown
state, disabled-before-load, already running, pending mutation) use the ordinary
[native action table](native-actions.md). Do not advertise those as Store
restrictions.

## Repository link and App Review assessment

The edition notice links to
[the Launchpane project](https://github.com/webmaxru/Launchpane) using
**“Project documentation and source on GitHub”**. The same repository contains
standalone installation instructions and releases. Clicking opens the system
browser; Launchpane does not download, install, update, or unlock another build.
The native About panel also links to this repository.

The wording intentionally avoids “Unlock”, “Upgrade”, “Buy”, and “Get the full
version”. It presents factual product limits and an optional project reference,
not a trial, purchase funnel, alternative updater, or prerequisite for using the
Store edition.

Checked against Apple's published
[App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/):

| Rule | Requirement and assessment |
| --- | --- |
| 2.4.5(i), 2.5.2 | Appropriate sandboxing and filesystem boundaries are required. Narrow temporary file exceptions remain subject to Apple's assessment. They are not a blanket authorization for launchctl or arbitrary log access. |
| 2.4.5(v) | Root escalation is prohibited. The administrator command is unavailable in the Store build, not merely hidden in the UI. |
| 2.4.5(iv), (vii) | The Store app must not install standalone apps/additional code to change functionality or provide an alternative update mechanism. The link only opens a project webpage; no in-app download/install/update occurs. |
| 2.2 | Demos, betas and trial versions do not belong on the Store. The edition must remain a useful finished product, not an advertisement for a “full” external build. |
| 2.3, 2.3.1 | Metadata and review notes must accurately reflect this edition. Document the disabled controls and link; screenshots must show the Store edition, not standalone administrator behavior. |
| 3.1.1, 3.1.1(a) | In-app unlocks and external purchase links have separate rules. This project-reference link supplies no paid unlock, license key, or purchase mechanism. Do not rely on a United States storefront exception for global distribution or assume iOS/iPadOS purchase-link entitlements authorize this design. Reassess if the destination or business model changes. |
| 4.2, 4.2.2, 4.2.3(i) | The app needs adequate independent utility and cannot primarily be marketing or require another app to function. Inventory, inspection and permitted user-agent workflows must work in the exact submitted sandboxed build. |

**Assessment, not approval:** neutral documentation/source wording is lower
risk than an external “full-version” promotion, but Apple does not expressly
pre-approve this exact hint or destination. Reviewers may still question
permanently disabled controls, the external distribution link, or the underlying
launch-service management. Explain them in review notes. Only Apple can approve
the submission.

## Verification boundaries

Frontend coverage exercises Store restrictions across every source, service
state, enabled state and privilege level, plus visible hints and project-link
success/failure. Store-feature Rust tests verify backend rejection before file
access, retained user/login-toggle eligibility, and disabled administrator/demo
capabilities. Standalone tests protect the broader native controls.

The local optimized Store-feature binary was run on this physical Mac
(macOS 12.7.6) in an isolated app bundle, ad-hoc signed with the configured
Store sandbox entitlements. It ran as UID 501, rendered a native window and
loaded 23 real services. The disabled Administrator button, edition notice,
shared-service menu and login-helper menu were inspected in the native UI:
all six shared-service mutations were disabled; login-helper lifecycle actions
were disabled while an eligible Disable toggle remained active. The GitHub link
opened Safari. No existing vendor service was mutated. The overflow menu fit
inside the window and retained scrolling for its longer explanations.

The release-asset check later exposed container-HOME inventory omission. The
Store build now resolves the account home through `getpwuid_r`, propagating
account lookup errors instead of silently substituting the container path.
The corrected local sandbox preview found all three disposable real user agents
and read actual stdout from a log inside the allowed LaunchAgents directory.
Its native captures and source fingerprint are recorded in
[`captures.json`](../branding/screenshots/source/captures.json).

These local checks did not exercise all sandboxed user-agent mutations, arbitrary log
access, Intel/universal execution, or a production provisioning profile. Those
must not be inferred from successful rendering or unit coverage.

A local feature build or ad-hoc sandbox smoke test is not the production-signed
App Store binary. The exact submitted build still needs native physical-device
QA and Apple's requested recording on the current macOS release. See
[`review-recording.md`](../appstore/review-recording.md) for the outstanding
submission gate; do not convert these local checks into an App Review approval
claim.
