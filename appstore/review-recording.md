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
not required for the main flow and must only expose Enable/Disable controls.

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
- [ ] Login Items, when present, expose only Enable/Disable.
- [ ] Errors remain visible and provide a recovery action.
- [ ] Light and dark macOS appearances render the main flow legibly.
- [ ] The temporary plist is removed after the test.
- [ ] The exact submitted build number is shown in the recording notes.

## Earlier replacement-build smoke test

At the earlier recheck, build `202610092309` was processed as `VALID` and
attached to version 1.2.1 in App Store Connect. It has since been replaced by
build `202610100953`. On a physical Apple M1 Mac, a locally re-signed copy of
the earlier release bundle was smoke-tested inside the App Sandbox: the Tauri
WebKit child process launched successfully and began loading the app UI. The
original build's WebKit child process failed to launch, leaving a blank window.

This earlier smoke test does not verify the currently attached build and does
not replace Apple's requested recording. The final recording requires the
currently attached build running on a physical Mac with the latest macOS.

Build `202610100953` is assigned to the internal TestFlight group
`Launchpane Internal QA`. The supplied video confirms that it launches and
loads its inventory, but does not demonstrate the complete user-agent flow.

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

- A supplied 55.55-second TestFlight capture confirms that build
  `202610100953` launches and loads its live inventory. The recording itself
  does not establish its OS version; the available host runs macOS 12.7.6. The
  capture shows unrelated desktop content and stops at the New Agent form. It
  does not show save, created-agent verification, removal, or cleanup. It
  remains unsuitable for attachment.
- `softwareupdate --list` offers macOS 27.0.1 (15.7 GB). It has not been
  installed because installation requires a disruptive system upgrade and
  restart, and approval was not available.
- The local native walkthrough is an automated development-build demonstration
  captured on macOS 12.7.6. It is not the requested exact-build recording on
  the latest macOS, and its capture begins after the window has appeared.
- The store screenshot sources are SVG UI reconstructions. They differ from
  the current native interface and must be replaced with actual app captures
  before submission.
- Local and live App Review notes now identify build `202610100953` and the
  outstanding evidence gaps. The live notes were read back and verified
  against the local source. Replace the pending-recording description with
  verified final evidence before submission.

The overall gate remains failed. Do not upload the local demonstration as
compliant review evidence or resubmit while these requirements are unresolved.

## User-directed resubmission: 2026-10-10

The user explicitly directed use of the supplied TestFlight recording after
the evidence gaps were explained. This overrides the local hold for this
resubmission, not the evidence assessment. Use
`Screen Recording 2026-10-10 at 17.30.33.mov`, not the local debug walkthrough.
The review notes disclose that the recording does not establish its macOS
version or show agent save/removal. Do not describe those checks as passed.
Existing store screenshots were left unchanged during this selective resubmission.

The supplied recording finished processing as `COMPLETE` under attachment
`4c674f0c-0dd5-433e-a7b5-56cf8fb3ac8e`. Live review notes were read back and
verified against the local source. Submission
`9249e9ef-0e6c-4043-9197-2bb9e2053b49` was submitted at
`2026-10-10T17:11:05.269Z`; both the submission and version 1.2.1 were verified
as `WAITING_FOR_REVIEW`. No latest-macOS or complete-write-flow claim was made.
