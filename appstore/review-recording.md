# App Review recording and QA checklist

Apple requested a screen recording captured on a physical Mac running the
latest macOS release. This file is the shot list and the bounded
test plan for that recording; it is intentionally not a simulated recording.

## Recording setup

- Use a physical Mac, not a browser preview or virtual machine.
- Install the exact signed build submitted to App Store Connect.
- Use a clean or test user account with no personal launch-agent data visible.
- Do not show credentials, unrelated files, personal notifications, or private
  launch-agent contents.
- Begin recording before launching Launchpane.
- Keep the recording at the Mac's native resolution and show the full app
  window and macOS menu bar.

## Required flow

1. Launch Launchpane from the Applications folder.
2. Wait for the inventory to finish loading and show the main list.
3. Search for a visible service label and clear the search.
4. Open the source dropdown and show User Agents, Home Agents, System Agents,
   System Daemons, and Login Items.
5. Select a user agent and show its status, enabled state, configuration, and
   any available logs.
6. Choose **New Agent** and create a temporary agent with:
   - Label: `com.launchpane.review.demo`
   - Program: `/usr/bin/true`
   - Run at login: disabled
   - Keep alive: disabled
7. Save the agent, show it in the User Agents list, open its detail view, and
   use the available action menu.
8. Remove the temporary agent and show the confirmation and refreshed list.
9. Select a system agent or daemon and show that mutation controls are
   unavailable/read-only.
10. Stop recording after the final refreshed state is visible.

Login Items can be shown when the review Mac has registered helpers. They are
not required for the main flow. Only Enable/Disable can be activated; applicable
lifecycle controls remain visible but disabled with a Store-specific reason.
Also show the disabled Administrator control and the edition notice's optional
GitHub documentation/source link. Neither can unlock additional Store features.

## Fail-closed recording gate

Do not upload a recording or submit the version unless every requirement below
has passed. A valid video file, a valid package signature, Apple's build
processing status, or a successful upload is not evidence that the app works.

- Confirm the exact build number and install it through TestFlight or another
  appropriate Apple distribution path. Do not present a browser preview,
  fake IPC inventory, or locally re-signed build as the submitted build.
- Verify native launch and the full user flow before recording. A launch
  rejection, blank window, unavailable inventory, failed create/remove action,
  or permission prompt is a gate failure, not content to submit.
- Confirm the physical device runs the latest macOS required by Apple.
  Record the actual OS version; never describe an older OS as the latest.
- Capture from before native launch through the final refreshed list. Show
  search, source selection, details, safe temporary-agent creation, removal
  confirmation, and system read-only behavior.
- Decode the entire video and check its duration, resolution, and frame count.
  Inspect the opening, every required action, and closing frames, and watch
  the full recording at normal speed. Reject missing actions, unreadable text,
  unrelated windows, sensitive information, errors, and simulated workflows.
- Verify that the temporary agent is absent after recording.
- Save a local gate result tied to the build and recording checksums. Missing,
  failed, and blocked checks must remain explicit; do not mark them passed.
- Keep the recording local for review. Uploading or resubmitting is a separate
  action and must not happen while any gate requirement is unresolved.

## Functional checks

- [ ] The app launches without an account, login, or network connection.
- [ ] Inventory loads without a crash on the review Mac.
- [ ] Search and source filtering return and clear results correctly.
- [ ] User-agent create, refresh, detail, and remove flow completes.
- [ ] System Agents and System Daemons remain read-only.
- [ ] Login Items, when present, permit only Enable/Disable; lifecycle controls show Store-specific disabled reasons.
- [ ] Administrator is disabled with a Store-specific hint; the optional GitHub project link opens the browser and does not download/install/unlock anything.
- [ ] Errors remain visible and provide a recovery action.
- [ ] Light and dark macOS appearances render the main flow legibly.
- [ ] The temporary plist is removed after the test.
- [ ] The exact submitted build number is shown in the recording notes.

## Verified replacement build

Replacement build `202610092309` is processed as `VALID` and attached to
version 1.2.1 in App Store Connect. On a physical Apple M1 Mac, a locally
re-signed copy of the same release bundle was smoke-tested inside the App
Sandbox: the Tauri WebKit child process launched successfully and began
loading the app UI. The original build's WebKit child process failed to
launch, leaving a blank window.

This smoke test does not replace Apple's requested recording. The final
recording still requires a physical Mac on the latest macOS release plus
Screen Recording and Accessibility permission for the capture operator.

The same build is available through the internal TestFlight group
`Launchpane Internal QA`; `salnikov@gmail.com` has been invited as an internal
tester. Use that installation for the final exact-build recording.

## Reply attachments

Attach the finished physical-device recording to the App Store Connect
message and paste the contents of `appstore/metadata/en-US/review-notes.txt`
into the App Review Information Notes field. Do not claim the recording is
complete until it has been captured and reviewed on the physical Mac.

## Resubmission recheck: 2026-10-10

Version 1.2.1 currently has build `202610100953` attached and remains
`DEVELOPER_REJECTED`, with no review attachments. Local asset dimension,
alpha-channel, version, and metadata-length checks pass, but they do not
establish submission readiness.

- The installed production-signed build still fails to launch because macOS
  finds no eligible provisioning profile. Build `202610100953` is now assigned
  to the existing internal QA TestFlight group, but its single tester remains
  `INVITED`; exact-build TestFlight execution remains unverified.
- `softwareupdate --list` offers macOS 27.0.1 (15.7 GB). It has not been
  installed because installation requires a disruptive system upgrade and
  restart, and approval was not available.
- The local native walkthrough is an automated development-build demonstration
  captured on macOS 12.7.6. It is not the requested exact-build recording on
  the latest macOS, and its capture begins after the window has appeared.
- The store screenshot sources are SVG UI reconstructions. They differ from
  the current native interface and must be replaced with actual app captures
  before submission.
- Local review notes now identify the attached build and outstanding QA
  accurately. The live App Store Connect notes still name the older build
  `202610092309`; update them with verified final evidence before submission.

The overall gate remains failed. Do not upload the local demonstration as
compliant review evidence or resubmit while these requirements are unresolved.

## Updated local assets: candidate 202610101605

The updated universal Store-feature candidate fixes account-home discovery:
App Sandbox's container HOME must not replace the real user's LaunchAgents and
Applications paths. The local sandboxed app now finds real user agents and reads
the disposable service's log through the requested LaunchAgents exception.

The active Store screenshot sources are now four native PNG captures, not the
historical SVG reconstructions. All accepted screenshot sizes are generated from
these PNGs. The capture manifest records the code fingerprint, image hashes,
build number, local sandbox signing and privacy masks; generation refuses stale
captures after app-source changes.

Distribution signing was attempted with the matching installed profile and
certificates, but macOS required keychain approval and the user was unavailable.
The request was canceled rather than bypassing authentication. The local app
and installer are explicitly labeled unsigned; an ad-hoc sandbox preview is
only for local inspection. No updated build, assets or recording were uploaded.
The exact submitted-build and latest-macOS recording gate is still unresolved.
