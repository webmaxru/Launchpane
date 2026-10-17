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
Launchpane is a free, MIT-licensed macOS app for launch agents, launch daemons, and login items. It shows what's loaded, running, and enabled, with exit status, logs, schedules, and plists in one window. You can run, stop, edit, and create your own agents, while shared system plists stay read-only.
```

About 100 words:

```boilerplate
Launchpane is a free, open-source macOS app that shows what starts on your Mac. It lists launch agents, launch daemons, and the login items that apps bundle, in one window with search and a source filter. For each service, it shows whether it's loaded, running, and enabled, along with its last exit status, logs, schedule, and plist. You can load, run, stop, restart, enable, disable, edit, and create your own agents. Shared system plists stay read-only, system daemons need an explicit administrator window, and unavailable actions explain why. Launchpane builds on azu's launchd-ui and is released under the MIT License.
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
| Downloads | DMG for Apple silicon (about 4 MB), Intel (about 4 MB), and Universal (about 7 MB), plus `.app` archives and `SHA256SUMS` |
| Signing | Developer ID signed and Apple notarized since v1.2.2 |
| Updates | No auto-updater; new versions are published on GitHub Releases |
| Privacy | No analytics, ads, accounts, or cloud backend |
| Built with | Tauri v2, Rust, React, TypeScript |
| Origin | Builds on azu's open-source launchd-ui |
| Maker | Maxim Salnikov |

What it covers:

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

A sandboxed Mac App Store edition is in preparation. Because of App Sandbox rules, it
inspects services and edits plists the user selects, but can't control services.

## Links

- Website: https://salnikov.no/projects/launchpane/
- Download: https://github.com/webmaxru/Launchpane/releases/latest
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
