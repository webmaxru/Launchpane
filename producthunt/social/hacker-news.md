# Hacker News

`hn-title` blocks (80 characters) are checked by `pnpm producthunt:verify`.

Show HN is for things people can try, and readers there respond to plain technical detail.
Read the current [Show HN guidelines](https://news.ycombinator.com/showhn.html) before
posting.

- Post on a **different day** from the Product Hunt launch, and don't mention or link
  Product Hunt.
- Don't ask anyone to upvote, comment, or "check out the post". HN penalizes coordinated
  voting, and it reads badly.
- Submit the GitHub repository as the URL so people can read the code and download a
  release from the same page.
- Paste the text below as the post text, or as your first comment if the form only takes a
  URL. HN renders plain text: blank lines separate paragraphs, and lines starting with two
  spaces render as code.
- Stay for the first two hours and answer questions directly. Agree with valid criticism.

## Submission

URL:

```text
https://github.com/webmaxru/Launchpane
```

Title (pick one):

```hn-title
Show HN: Launchpane – launch agents, daemons and login items on macOS
```

```hn-title
Show HN: Launchpane – an open-source macOS app for launchd jobs and login items
```

Text:

```hn-text
Launchpane is a macOS app for launch agents, launch daemons and login items. It's MIT-licensed and builds on azu's launchd-ui.

I wanted one place to answer "what starts on this Mac, and is it doing what I think?" without piecing it together from several folders, System Settings and launchctl print output.

What it does:

- Lists ~/Library/LaunchAgents, /Library/LaunchAgents, /Library/LaunchDaemons, and login item helpers bundled inside apps in /Applications and ~/Applications.
- Shows loaded, running and enabled state, PID, last exit status, schedule, stdout/stderr logs, and the plist itself.
- For your own agents: load, run now, stop, restart, enable, disable, create and edit, with a preview of the next scheduled runs.
- A Commands tab shows the equivalent launchctl commands.

Some decisions you might disagree with: shared plists in /Library stay read-only. System daemons need an explicit relaunch as administrator through the standard macOS password prompt. After load, unload, enable and disable, it reads the state back from launchd instead of trusting the exit status. When an action is unavailable, the menu says why. There are no analytics, accounts or cloud backend, and no auto-updater.

It's Tauri v2. The Rust side runs launchctl through std::process::Command and parses plists with the plist crate. Releases are Developer ID signed and notarized for Apple silicon, Intel and Universal, with SHA256SUMS.

I'd like to hear where it's wrong or unclear, especially from people who work with launchd jobs often.
```

## Likely questions

Use the answers in `../replies.md`. A few that come up more on HN:

```hn-reply
Why not just use launchctl? You can, and the Commands tab shows the equivalent commands for each service. Launchpane is for seeing everything together: which folder a job lives in, whether it's loaded, enabled and running, its last exit status and logs, without running several commands per label.
```

```hn-reply
Why Tauri rather than SwiftUI? The project started from azu's launchd-ui, which is Tauri, and the Rust side is a thin layer over launchctl and plist parsing. The DMG is about 4 MB per architecture. Happy to hear where the UI feels off for a Mac app.
```

```hn-reply
Does it need Full Disk Access? It doesn't request it. It reads the launchd folders and app bundles your user can already read, and runs launchctl in your session. Only system daemons need the separate administrator window.
```
