# Press kit

Facts, descriptions, and images for anyone writing about Launchpane. Everything here can be
quoted or reused. Check the latest release before publishing a version number.

## Descriptions

About 25 words:

```boilerplate
Launchpane is a free, open-source macOS app that shows launch agents, launch daemons, and login items in one window, with their status, logs, and plists.
```

About 50 words:

```boilerplate
Launchpane is a free, MIT-licensed macOS app for launch agents, launch daemons, and login items. The recommended standalone edition inspects and controls services, with logs, schedules, and a plist editor. The Mac App Store edition is limited to inspection and personal plist editing because of sandbox restrictions.
```

About 100 words:

```boilerplate
Launchpane is a free, open-source macOS app that shows what starts on your Mac: launch agents, daemons, and login items in one searchable window. The recommended standalone edition controls services, shows status and logs, and creates and edits personal plists with schedule previews. It is Developer ID signed and Apple notarized. Shared plists stay read-only, and system daemons need an explicit administrator window. The Mac App Store edition is available for inspection and personal plist editing; sandbox restrictions remove service control, removal, and administrator mode. Launchpane builds on azu's launchd-ui and is released under the MIT License.
```

## Facts

| | |
| --- | --- |
| Name | Launchpane |
| Tagline | Know what starts on your Mac |
| Platform | macOS |
| Price | Free |
| License | MIT |
| Latest release | 1.3.4 (check https://github.com/webmaxru/Launchpane/releases/latest) |
| Downloads | Recommended standalone: DMG for Apple silicon (about 4 MB), Intel (about 4 MB), and Universal (about 7 MB), plus `.app` archives and `SHA256SUMS`. Mac App Store: sandboxed inspector and personal plist editor |
| Signing | Standalone: Developer ID signed and Apple notarized since v1.2.2 |
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

A sandboxed Mac App Store edition is available now. App Store sandbox and privilege
restrictions limit it to inspection and personal plist editing: no load, run, stop,
restart, enable/disable, removal, or administrator mode. Inventory and log folders must
be selected each time the app reopens. Saving a personal plist does not activate or reload
its service. Recommend standalone for service management.

Developer ID signing verifies the developer and detects changes to the signed app;
notarization checks for known malware. The standalone release pipeline verifies
Gatekeeper acceptance before publishing. These protections are not a guarantee of safety
or App Store review. See [Apple's download security guidance](https://support.apple.com/en-us/102445).

## Links

- Website: https://salnikov.no/projects/launchpane/
- Standalone download (recommended): https://github.com/webmaxru/Launchpane/releases/latest
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
the Launchpane design, and the signed release pipeline.

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
| `assets/gallery/07-download.png` | 2540×1520 | Closing card |
| `assets/social/wide-live-1600x900.png` | 1600×900 | Wide card with screenshot |
| `assets/social/square-live-1080x1080.png` | 1080×1080 | Square card with screenshot |
| `capture/*.png` | 2× window size | Unframed native window captures |

Paths are relative to this folder:
https://github.com/webmaxru/Launchpane/tree/main/producthunt
