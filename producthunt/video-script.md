# Video script

An optional 60–75 second walkthrough for the Product Hunt gallery. Upload it to YouTube and
add the link as the first gallery item, or skip it; the gallery works without one.

Many people watch with the sound off, so every scene has an on-screen caption. The voiceover
is optional and can be recorded separately.

## Before recording

- Record in a separate macOS user account created for the demo (for example, `demo`). Your own
  account's agents, user name, and home folder path stay out of the video. Items in
  `/Library` and login items from `/Applications` are shared by every account, so check that
  nothing on screen is private before you publish.
- In that account, install the demo agents:

  ```sh
  zsh producthunt/capture/demo-agents.sh up
  ```

  They're labelled `com.launchpane.demo.*` and write only to `/tmp/launchpane-demo`. The sync
  agent fails on purpose, so there's a real exit status and error log to show.
- Install the latest signed release from GitHub, not a development build.
- Use the system appearance you want (the gallery uses dark). Hide the Dock and desktop icons,
  and turn on Do Not Disturb.
- Record the Launchpane window only, with Screenshot (⇧⌘5) → Record Selected Portion, at a
  window size around 1440×900 points. Export at 1920×1080 or 2560×1440.
- Move the pointer slowly and pause for a second after each click.
- When you're done, remove the demo agents:

  ```sh
  zsh producthunt/capture/demo-agents.sh down
  ```

## Storyboard

| Time | Screen | Caption | Voiceover (optional) |
| --- | --- | --- | --- |
| 0:00–0:05 | App icon on a dark background, then the Launchpane window opening. | Know what starts on your Mac. | Background work on a Mac is spread across several folders and System Settings. Launchpane puts it in one place. |
| 0:05–0:15 | The service list. Press `/`, type `demo`, then clear the search. | Launch agents, daemons, and login items in one window. | Launch agents, launch daemons, and login items, with whether each one is loaded, running, and enabled. |
| 0:15–0:23 | Open the source filter and step through My agents, System daemons, and Login items. | Filter by where a service comes from. | Filter by source to see your own agents, shared ones, system daemons, or login items. |
| 0:23–0:35 | Select `com.launchpane.demo.sync`. Show Last exit `1`, then open the Logs tab and the standard error line. | Follow the evidence, not a guess. | This sync agent is failing. Its last exit status is 1, and the error log says why: the destination isn't mounted. |
| 0:35–0:45 | Select `com.launchpane.demo.cleanup`. Show its calendar schedule and the Next runs list. | See when it runs next. | Schedules show as intervals or calendar times, with a preview of the next runs. |
| 0:45–0:53 | Open the actions menu on a system daemon. Each unavailable action shows its reason under it. Point to Open Administrator Window without clicking. | Power with clear boundaries. | Shared plists stay read-only, system daemons need an explicit administrator window, and unavailable actions say why. |
| 0:53–1:00 | Back on the sync agent, open the Commands tab and copy a command. | The launchctl commands, ready to copy. | Every action has its launchctl equivalent, ready to copy. |
| 1:00–1:10 | Closing card (`assets/social/wide-thanks-1600x900.png` style): icon, name, GitHub URL. | Free and open source. Signed and notarized. github.com/webmaxru/Launchpane | Launchpane is free and MIT-licensed, built on azu's open-source launchd-ui. Download it from GitHub. |

## YouTube details

```text
Title: Launchpane: launch agents, daemons, and login items on macOS

Launchpane is a free, open-source Mac app that shows what starts on your Mac: launch agents, launch daemons, and login items, with their status, logs, schedules, and plists in one window.

Download: https://github.com/webmaxru/Launchpane/releases/latest
Website: https://salnikov.no/projects/launchpane/
Source (MIT): https://github.com/webmaxru/Launchpane

Launchpane builds on azu's open-source launchd-ui: https://github.com/azu/launchd-ui

The services in this video are demo agents created for the recording.
```

Use `assets/social/wide-live-1600x900.png` as the custom thumbnail (YouTube accepts 16:9 up to
2 MB), and upload the captions as a subtitle file rather than relying on auto-captions.
