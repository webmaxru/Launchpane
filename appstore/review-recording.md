# App Review recording and QA checklist

## Current edition: 1.3.4 entitlement minimization

Candidate 1.3.4 removes the unused `com.apple.security.network.server`
entitlement flagged by App Review on build `1.3.3 (202610162230)`. A sandboxed
removal test on macOS 12.7.6 showed `network.client` alone renders the full UI
while a build with no network entitlement is blank. All four native captures
were refreshed from local sandbox preview `1.3.4 (202610170010)`, signed with
only the three remaining entitlements, after actual folder selection,
disposable plist creation through New Agent, editing its standard-output path,
sample-log reading and Spotify login-helper search. The plist was verified not
registered with launchd and was removed afterward. Those captures are local
preview evidence.

Production build `1.3.4 (202610171400)` is Apple-processed `VALID`, attached to
the manual-release version, and was installed through TestFlight on a MacBook
Air (M1) running macOS 12.7.6 (TestFlight Beta Distribution signature, team
`B9FMXAW5TZ`, App Store receipt present). Its signed entitlements are only
`app-sandbox`, `files.user-selected.read-write` and `network.client` plus the
Apple-added `application-identifier`, `team-identifier` and
`beta-reports-active`; no `network.server` or `get-task-allow`. On that exact
build the following were verified: the window renders (not blank), the error
card and wrapped technical details before folder consent, folder panel Cancel
(no error, access unchanged), granting `~/Library/LaunchAgents` (6 services),
label search, a row menu limited to View details and Reveal in Finder, and a
details view offering only Edit and Reveal. No current-macOS screen recording
was attached; this host runs macOS 12.7.6.

### Previous candidate: 1.3.3 (October 16, 2026)

Candidate 1.3.3 fixes folder-access and inventory error formatting seen in the
1.3.2 TestFlight build: non-launchctl failures no longer carry a
"launchctl error" prefix, and the error card and toast wrap long details.
All four native captures were refreshed from local sandbox preview
`1.3.3 (202610162201)` after actual folder selection, disposable plist creation
through the New Agent form, editing a standard-output path, selected sample-log
reading and Spotify login-helper search. The plist was verified not registered
with launchd and was removed afterward. Those captures are local preview
evidence.

Production build `1.3.3 (202610162230)` is Apple-processed `VALID`, attached to
the manual-release version, and was installed through TestFlight on a MacBook
Air (M1) running macOS 12.7.6 (TestFlight Beta Distribution signature, App
Store receipt present, no `get-task-allow`). On that exact build the following
were verified: fixed error card before folder consent, folder panel Cancel
(no error, access unchanged), granting `~/Library/LaunchAgents`, inventory,
label search, a row menu limited to View details and Reveal in Finder, and a
details view offering only Edit and Reveal. Review submission
`9249e9ef-0e6c-4043-9197-2bb9e2053b49` was resubmitted with this build on
October 16, 2026; App Review then rejected that build for the unused
`network.server` entitlement (see `rejection-postmortems.md`). No current-macOS screen
recording was attached; this host runs macOS 12.7.6.

### Previous candidate: 1.3.2

Production candidate `1.3.2 (202610160102)` is Apple-processed `VALID`, attached
to the manual-release version, and assigned to `Launchpane Internal QA`.
The four screenshots have completed processing. It uses immutable source
`cf1cbbeb50b9fc7459d29f3088adc25f24263872`, also published as standalone `v1.3.2`.
Build `202610160101` failed Apple upload validation because its installer embedded
a root-only provisioning profile. Build `202610160102` preserves the same app
source, increments the build number, normalizes bundle permissions, and was
re-signed/repackaged using the existing Store certificates. Its package SHA-256
is `d4116011ceed884679c4c6ee6ad85d67ba6f3c0c0f417d836e9c9459f6430eae`.
Apple API upload validation passed; local `altool` is unavailable on this host.
No exact-build native QA, current-macOS recording, or App Review submission is
claimed. TestFlight opens a loading window; installation has not been verified.

The frozen 1.3.1 Store pipeline stopped before signing/upload because current
macOS ImageIO preserved alpha during the previous BMP conversion. The parallel
standalone run was canceled before publication; the immutable tag is retained.
Candidate 1.3.2 fixes screenshot rendering using an explicitly opaque RGB
CoreGraphics context, with a real-render regression checking PNG color type.
All four native captures were refreshed from local sandbox preview
`1.3.2 (202610160101)` after actual folder selection, disposable plist creation,
editor inspection and selected sample-log reading. The plist was verified not
registered. The manifest records new hashes and the new app-source fingerprint.
These remain local preview evidence, not exact production-build QA.

The user authorized removing unsupported Store functionality. This supersedes
the historical shot list and holds below that require Store service control or
in-app removal. The Store edition is now an inspector and personal plist editor;
standalone remains a full service manager. No blanket claim of App Review
compliance is made by removing controls.

The current physical-device recording must show native launch, missing-consent
recovery and cancellation, explicit folder selection, inventory, search/source
filtering, configuration/schedule inspection, selected-folder log access,
personal plist create/edit/save without activation, absence of runtime/toggle/
removal/admin controls, and closing/reopening with fresh consent required.
Clean the disposable plist using Finder afterward; no Store Remove action exists.
The neutral edition comparison and documentation/source link must not install,
update, purchase or unlock another edition. Demonstrate light and dark appearance.

The exact production-signed build must be installed through TestFlight/an
appropriate Apple path on a physical Mac running the current required macOS.
Watch the complete recording, decode it, inspect required flows and privacy,
and tie it to build and video checksums. Historical videos do not verify it.
Record unresolved checks explicitly; never reuse an earlier waiver or claim
that ad-hoc local previews establish production-signed QA.

The available Mac currently runs 12.7.6; softwareupdate offers 27.0.1 and requires
a restart. The user authorizes checklist actions on this laptop, including
advancing to real authentication/device gates, but no credential may be invented.

Local 1.3.1 sandbox preview `202610160100` evidence (not submitted-build QA):
native launch, missing-consent recovery, cancel/reselect, personal LaunchAgents
and Applications grants, filtered inventory, real login-helper inspection,
disposable `/usr/bin/true` plist creation and subsequent log-path editing passed.
The created plist has no RunAtLoad, KeepAlive or schedule activation and
`launchctl print` confirmed it was not registered. The sandboxed log reader read
a labeled sample log in the granted folder. Runtime and administrator controls
are absent. All four screenshots were recaptured from this native build; the
manifest records hashes and explicit log-path privacy masks.

The automatic OS update cannot proceed unattended: `sudo -n true` reports
"a password is required". macOS owner authentication is a real remaining gate,
not a reason to bypass the current-OS/exact-production-build recording requirement.

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
- Before inventory access, demonstrate **Choose folders…** and explicitly
  select the test user's `~/Library/LaunchAgents`, shared LaunchAgents and
  LaunchDaemons folders, and Applications when showing login helpers. Show
  picker cancellation, successful selection, and re-selection after reopening.
  Select a log's containing folder before demonstrating log access.

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

## Recording evidence gate

Do not claim that a recording satisfies Apple's request or mark the evidence
gate as passed unless every requirement below has passed. A valid video file,
a valid package signature, Apple's build processing status, or a successful
upload is not evidence that the app works.

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
- Keep the recording local for review until the checks are complete. If the
  user directs submission while a check is unresolved, disclose the limitation
  and keep the evidence gate failed.

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
- [ ] Initial missing consent has a clear recovery action; cancellation grants no access.
- [ ] Only selected inventory roots are shown, and reopening asks for consent again.
- [ ] The final signed app omits get-task-allow and all temporary file exceptions.

## October 15 replacement preparation

Apple rejected 1.2.1 (`202610100953`) under guideline 2.4.5(i), submission
`9249e9ef-0e6c-4043-9197-2bb9e2053b49`. The 1.3.1 source removes the rejected
entitlements and replaces automatic external folder access with NSOpenPanel.
Both distribution editions use the same four version manifests; previously
published 1.3.0 standalone assets are not overwritten.

The available local Mac runs macOS 12.7.6. No new exact-build TestFlight
recording on current macOS is available. The prior user-directed waiver was
for the October 10 submission only. A new build, upload, or entitlement
validation must not be described as satisfying the outstanding recording gate.
Do not submit the replacement until its current native QA evidence passes.

Local native sandbox testing of candidate `202610152100` verified launch,
initial permission error, picker cancellation, explicit LaunchAgents selection,
inventory, fresh consent after reopening, and creation of a disposable
`/usr/bin/true` agent. It exposed and corrected a coupled issue: new Store agents
must not automatically populate logs under an unselected `~/Library/Logs` folder.
Optional log paths now start empty; standalone keeps its normal defaults.

**Functional gate failed:** Load on that disposable plist returned bootstrap
error 5 (Input/output error) inside the ad-hoc sandbox preview. The identical
valid plist successfully bootstrapped and booted out when tested outside the
sandbox. User-selected file access is therefore insufficient evidence of
working service control. These checks are not production-signed/TestFlight QA.
Do not replace failed lifecycle checks with successful compilation or file
creation. Preserve management features pending Apple/DTS guidance rather than
silently converting the Store product to an inspector or resubmitting a broken
workflow. The prior recording and screenshots do not establish readiness.

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

## Recording attachment checklist

For a recording that passes the evidence gate, attach it to App Store Connect
and keep `appstore/metadata/en-US/review-notes.txt` aligned with the live App
Review Information Notes. Do not describe incomplete recording steps as
passed.

## Resubmission recheck: 2026-10-10

Version 1.2.1 has build `202610100953` attached. Following the user-directed
resubmission on 2026-10-10, its App Store Connect state is
`WAITING_FOR_REVIEW`; recording attachment processing completed successfully.
Local asset dimension, alpha-channel, version, and metadata-length checks pass,
but they do not establish evidence completeness.

- A supplied 55.55-second TestFlight capture confirms that build
  `202610100953` launches and loads its live inventory. The recording itself
  does not establish its OS version; the available host runs macOS 12.7.6. The
  capture shows unrelated desktop content and stops at the New Agent form. It
  does not show save, created-agent verification, removal, or cleanup. It was
  attached as supplemental evidence at the user's direction, with these
  limitations disclosed; it does not pass this checklist's complete-flow gate.
- `softwareupdate --list` offers macOS 27.0.1 (15.7 GB). It has not been
  installed because installation requires a disruptive system upgrade and
  restart, and approval was not available.
- The local native walkthrough is an automated development-build demonstration
  captured on macOS 12.7.6. It is not the requested exact-build recording on
  the latest macOS, and its capture begins after the window has appeared.
- The current local screenshot sources are native PNG captures generated from
  candidate `202610101605`, which has not been uploaded or attached. The
  existing App Store screenshots were left unchanged in this resubmission;
  verify the screenshots against the attached build before a future update.
- Local and live App Review notes identify build `202610100953` and disclose
  the supplied recording's limitations. The live notes were read back and
  verified against the local source before resubmission.

The exact-build/latest-macOS/full-flow evidence gate remains failed. The user
directed resubmission with the supplied TestFlight recording as supplemental
evidence; do not describe it as passing that gate.

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
only for local inspection. Candidate build `202610101605` and its screenshots
were not uploaded; the separately supplied TestFlight recording and submission
are documented above. The exact-build and latest-macOS recording gate remains
unresolved.
