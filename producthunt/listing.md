# Product Hunt listing

Copy-and-paste values for the Product Hunt submission form. `listing.json` holds the same
strings for tooling; `pnpm producthunt:verify` fails if the two drift apart.

## Basics

| Field | Value |
| --- | --- |
| Name | Launchpane |
| Tagline (28/60) | Know what starts on your Mac |
| Website | https://salnikov.no/projects/launchpane/ |
| Additional link: standalone download (recommended) | https://github.com/webmaxru/Launchpane/releases/latest |
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

## Description (247/260)

```text
Launchpane shows macOS launch agents, daemons, and login items in one window. The signed, notarized standalone app controls services, shows logs, and edits schedules. Free and MIT-licensed. Mac App Store edition: inspection and plist editing only.
```

## Thumbnail

Upload `assets/thumbnail/thumbnail-240.gif` (animated pulse, 240×240). If the uploader rejects
the GIF, use `assets/thumbnail/thumbnail-240.png`.

## Gallery

Upload in this order. Every image is 2540×1520 (2× of 1270×760) and under 3 MB.
These show the recommended standalone edition; Store sandbox restrictions remove service
controls. Keep that distinction when adding the App Store link.

| # | File | Caption | Alt text |
| --- | --- | --- | --- |
| 1 | `assets/gallery/01-overview.png` | Launch agents, daemons, and login items in one native window. | Launchpane in dark mode listing four demo launch agents with their source, status, enabled state, PID, last run, and a primary action for each. |
| 2 | `assets/gallery/02-sources.png` | Filter by source: your agents, user agents, system agents, system daemons, or login items. | The service source menu open, listing All services, My agents, User agents, System agents, System daemons, and Login items with a short description of each. |
| 3 | `assets/gallery/03-actions.png` | Unavailable actions stay visible and say why. | The actions menu for a running demo agent. Load, Run now, and Enable are dimmed with reasons such as Already loaded; Unload, Restart, Disable, and Reveal in Finder are available. |
| 4 | `assets/gallery/04-logs.png` | Last exit status and standard error for a failing agent. | Detail panel for a demo sync agent showing last exit 1 and a standard error line saying the destination volume is not mounted. |
| 5 | `assets/gallery/05-schedule.png` | Interval or calendar schedules with a preview of the next runs. | Edit Agent form with a daily calendar schedule and a Next runs preview listing the next three run times. |
| 6 | `assets/gallery/06-commands.png` | The equivalent launchctl commands, ready to copy. | Commands tab listing launchctl kickstart, bootout, enable, disable, and print commands for a demo agent, each with a copy button. |
| 7 | `assets/gallery/07-download.png` | Free and open source. Signed and notarized builds on GitHub. | Launchpane icon and name with the tagline Know what starts on your Mac, labels for MIT license, Developer ID signing and notarization, Apple silicon, Intel, and Universal builds, and no analytics or accounts, and the GitHub address. |

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
