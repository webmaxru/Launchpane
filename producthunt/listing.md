# Product Hunt listing

Copy-and-paste values for the Product Hunt submission form. `listing.json` holds the same
strings for tooling; `pnpm producthunt:verify` fails if the two drift apart.

## Basics

| Field | Value |
| --- | --- |
| Name | Launchpane |
| Tagline (28/60) | Know what starts on your Mac |
| Website | https://salnikov.no/projects/launchpane/ |
| Additional link: signed standalone download (recommended) | https://github.com/webmaxru/Launchpane/releases/latest |
| Additional link: Mac App Store (inspection and plist editing) | https://apps.apple.com/no/app/launchpane/id6820735995?mt=12 |
| Additional link: source | https://github.com/webmaxru/Launchpane |
| Pricing | Free |
| Open source | Yes (MIT) |
| Topics | Mac · Developer Tools · Open Source |

Product Hunt appends its own `ref=producthunt` parameter to outbound links, so the URLs
above carry no tracking parameters.

### Tagline alternates

Keep the brand line unless a reviewer finds it too abstract. These alternates describe the
same product more literally:

- See and control what starts on your Mac
- Launch agents, daemons, and login items in one window
- Free, open-source launchd manager for macOS

## Description (249/260)

```text
Launchpane shows macOS launch agents, daemons, and login items in one window. Free and MIT-licensed. The signed, Apple-notarized download controls services, reads logs, and edits schedules. Also on the Mac App Store for inspection and plist editing.
```

## Thumbnail

Upload `assets/thumbnail/thumbnail-240.gif` (animated pulse, 240×240). If the uploader rejects
the GIF, use `assets/thumbnail/thumbnail-240.png`.

## Gallery

Upload in this order. Every image is 2540×1520 (2× of 1270×760) and under 3 MB.
Images 1–6 show the recommended standalone edition, which is Developer ID signed and
notarized by Apple. Image 7 shows both ways to get the app, with Apple's unmodified Mac App
Store badge. The Store edition runs in the App Sandbox, which blocks service controls, so
keep Store mentions to inspection and plist editing. Say the Store build passed App Review,
never that Apple endorses or recommends Launchpane.

| # | File | Caption | Alt text |
| --- | --- | --- | --- |
| 1 | `assets/gallery/01-overview.png` | Launch agents, daemons, and login items in one native window. | Launchpane in dark mode listing four demo launch agents with their source, status, enabled state, PID, last run, and a primary action for each. |
| 2 | `assets/gallery/02-sources.png` | Filter by source: your agents, user agents, system agents, system daemons, or login items. | The service source menu open, listing All services, My agents, User agents, System agents, System daemons, and Login items with a short description of each. |
| 3 | `assets/gallery/03-actions.png` | Unavailable actions stay visible and say why. | The actions menu for a running demo agent. Load, Run now, and Enable are dimmed with reasons such as Already loaded; Unload, Restart, Disable, and Reveal in Finder are available. |
| 4 | `assets/gallery/04-logs.png` | Last exit status and standard error for a failing agent. | Detail panel for a demo sync agent showing last exit 1 and a standard error line saying the destination volume is not mounted. |
| 5 | `assets/gallery/05-schedule.png` | Interval or calendar schedules with a preview of the next runs. | Edit Agent form with a daily calendar schedule and a Next runs preview listing the next three run times. |
| 6 | `assets/gallery/06-commands.png` | The equivalent launchctl commands, ready to copy. | Commands tab listing launchctl kickstart, bootout, enable, disable, and print commands for a demo agent, each with a copy button. |
| 7 | `assets/gallery/07-download.png` | On the Mac App Store, or as a signed, Apple-notarized download from GitHub. | Launchpane icon and name with the tagline Know what starts on your Mac. Below it, Apple's Download on the Mac App Store badge, noted as sandboxed for inspecting and editing plists, and a Download from GitHub Releases button, noted as recommended, Developer ID signed, and Apple notarized. Labels for the MIT license, Apple silicon, Intel, and Universal builds, and no analytics or accounts, then the GitHub address. |

The screenshots use four disposable demo agents (`com.launchpane.demo.*`) created by
`capture/demo-agents.sh`, so no personal services appear. See `capture/captures.json` for
provenance.

## Video (optional)

Product Hunt accepts a YouTube link as the first gallery item. `video-script.md` has a
60–75 second storyboard that uses the same demo agents. Launch without a video rather than
with a rushed one.

## Maker comment

Post `first-comment.md` as the first comment as soon as the launch is live.

## Credits

Launchpane builds on azu's open-source [launchd-ui](https://github.com/azu/launchd-ui). The
first comment and press kit say so; keep that credit in any rewrite.
