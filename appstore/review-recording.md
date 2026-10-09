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

## QA checks before recording

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
