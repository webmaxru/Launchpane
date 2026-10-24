# Press kit

Facts, descriptions, and images for anyone writing about Launchpane. Everything here can be
quoted or reused. Check the latest release before publishing a version number.

## Descriptions

About 25 words:

```boilerplate
Launchpane is a free, open-source macOS app for launch agents, daemons, and login items. Get it signed and notarized from GitHub, or on the Mac App Store.
```

About 50 words:

```boilerplate
Launchpane is a free, MIT-licensed macOS app for launch agents, launch daemons, and login items. The recommended standalone download, Developer ID signed and notarized by Apple, controls services and includes logs, schedules, and a plist editor. The Mac App Store edition passed App Review; its sandbox limits it to inspection and personal plist editing.
```

About 100 words:

```boilerplate
Launchpane is a free, open-source macOS app that shows what starts on your Mac: launch agents, daemons, and login items in one searchable window. The recommended standalone edition controls services, shows status and logs, and creates and edits personal plists with schedule previews. Shared plists stay read-only, and system daemons need an explicit administrator window. Standalone builds are Developer ID signed and notarized by Apple, built by a public GitHub Actions workflow, and published with SHA256SUMS. The Mac App Store edition passed App Review and runs in the App Sandbox, which limits it to inspection and personal plist editing. Launchpane builds on azu's launchd-ui and is MIT-licensed.
```

## Facts

| | |
| --- | --- |
| Name | Launchpane |
| Tagline | Know what starts on your Mac |
| Platform | macOS |
| Price | Free |
| License | MIT |
| Latest version | 1.3.4 on both GitHub Releases and the Mac App Store (check https://github.com/webmaxru/Launchpane/releases/latest and the Store listing before publishing) |
| Downloads | Recommended standalone: DMG for Apple silicon (about 4 MB), Intel (about 4 MB), and Universal (about 7 MB), plus `.app` archives and `SHA256SUMS`. Mac App Store: sandboxed inspector and personal plist editor, free |
| Verification | Standalone: Developer ID signed and notarized by Apple since v1.2.2, built by a public GitHub Actions workflow that verifies Gatekeeper acceptance, with `SHA256SUMS` in every release. Mac App Store edition: passed App Review, runs in the App Sandbox |
| Updates | Standalone: no auto-updater; new versions on GitHub Releases. Store edition: updates through the Mac App Store |
| Privacy | No analytics, ads, accounts, or cloud backend |
| Built with | Tauri v2, Rust, React, TypeScript |
| Origin | Builds on azu's open-source launchd-ui |
| Maker | Maxim Salnikov |

What the standalone edition covers:

- Launch agents in `~/Library/LaunchAgents` and `/Library/LaunchAgents`, launch daemons in
  `/Library/LaunchDaemons`, and login item helpers bundled inside apps.
- Loaded, running, and enabled state, PID, last exit status, schedules, stdout and stderr
  logs, plist configuration, and the equivalent launchctl commands.
- Load, run, stop, restart, enable, disable, create, edit, and remove the user's own agents,
  with a preview of upcoming scheduled runs.
- Shared plists stay read-only. System daemons need an explicit administrator window. After
  loading, unloading, enabling, or disabling, Launchpane reads the state back from launchd
  and reports a mismatch instead of assuming success.

What it isn't: a process monitor, a cleaner, or a security scanner. It shows what launchd is
configured to run; it doesn't judge whether a service is safe.

## Two ways to get it

Both editions are free, MIT-licensed, and built from the same source. Recommend the
standalone download for service management.

### Standalone download (recommended)

- **Developer ID signed**, so macOS can verify the developer and detect changes to the
  signed app.
- **Notarized by Apple**, which checks the submitted software for known malware. The
  notarization ticket is stapled to the app and the DMG.
- **Built in public** by a GitHub Actions workflow in the open-source repository. Before it
  publishes, the workflow verifies the signature and Gatekeeper acceptance.
- **`SHA256SUMS`** ships with every release so downloads can be checked.

These protections are meaningful, but they are not a guarantee of safety, and notarization
is not App Review. See [Apple's download security guidance](https://support.apple.com/en-us/102445).

### Mac App Store

The Mac App Store edition passed App Review and runs in Apple's App Sandbox. The sandbox
limits it to inspection and personal plist editing: no load, run, stop, restart,
enable/disable, removal, or administrator mode. Inventory and log folders are chosen in the
macOS picker; from version 1.4.0 they are remembered after relaunch. Saving a personal
plist does not activate or reload its service.

Say the Store edition passed App Review. Don't say Apple approved, endorsed, or recommends
Launchpane.

## Links

- Website: https://salnikov.no/projects/launchpane/
- Standalone download (recommended, signed and notarized): https://github.com/webmaxru/Launchpane/releases/latest
- Mac App Store: https://apps.apple.com/no/app/launchpane/id6820735995?mt=12
- Source: https://github.com/webmaxru/Launchpane
- Support: https://salnikov.no/projects/launchpane/support/
- Privacy: https://salnikov.no/projects/launchpane/privacy/
- Upstream project: https://github.com/azu/launchd-ui

## Credits

Launchpane builds on [azu/launchd-ui](https://github.com/azu/launchd-ui) and the work of its
contributors, including the original service list, controls, logs, schedules, dark mode, and
copyable launchctl commands. Maxim Salnikov added login items, enable and disable, shared
agent and administrator controls, explanations for unavailable actions, read-back checks,
the Launchpane design, the signed release pipeline, and the Mac App Store edition.

## Images

All screenshots are native captures of the signed release, showing demo agents created for
the purpose. They're free to use when writing about Launchpane.

| File | Size | What it shows |
| --- | --- | --- |
| `assets/thumbnail/icon-1024.png` | 1024×1024 | App icon |
| `assets/thumbnail/thumbnail-240.gif` | 240×240 | Animated icon |
| `assets/gallery/01-overview.png` | 2540×1520 | The service list |
| `assets/gallery/02-sources.png` | 2540×1520 | The source filter |
| `assets/gallery/03-actions.png` | 2540×1520 | Unavailable actions with reasons |
| `assets/gallery/04-logs.png` | 2540×1520 | Exit status and error log of a failing agent |
| `assets/gallery/05-schedule.png` | 2540×1520 | A calendar schedule with next runs |
| `assets/gallery/06-commands.png` | 2540×1520 | Equivalent launchctl commands |
| `assets/gallery/07-download.png` | 2540×1520 | Closing card with both ways to get it: Apple's Mac App Store badge and the GitHub Releases download |
| `assets/social/wide-live-1600x900.png` | 1600×900 | Wide card with screenshot |
| `assets/social/square-live-1080x1080.png` | 1080×1080 | Square card with screenshot |
| `capture/*.png` | 2× window size | Unframed native window captures |

Image 7 includes Apple's official Mac App Store badge, unmodified. If you reuse the badge
on its own, take it from Apple's marketing resources, link it to the Store listing, and
don't alter it.

Apple, the Apple logo, Mac, and macOS are trademarks of Apple Inc., registered in the U.S.
and other countries. Mac App Store is a service mark of Apple Inc.

Paths are relative to this folder:
https://github.com/webmaxru/Launchpane/tree/main/producthunt
