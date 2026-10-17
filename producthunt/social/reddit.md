# Reddit

Fenced `reddit-title` blocks (300 characters) and `reddit-body` blocks (40,000 characters)
are checked by `pnpm producthunt:verify`.

Reddit communities dislike vote campaigns, so these posts do not mention Product Hunt or
link to it. Post them on a different day from the launch, and only in communities where you
already take part.

Before posting in any subreddit:

1. Read its current rules and sidebar. Many limit self-promotion, require a flair, or allow
   app posts only on certain days or in a weekly thread.
2. Say plainly that you made the app.
3. Stay for the comments. Answer questions with facts from `../replies.md`.
4. Post one subreddit at a time; do not cross-post the same text to several at once.

## r/macapps

```reddit-title
I made Launchpane, a free and open-source app for launch agents, daemons, and login items
```

```reddit-body
Hi r/macapps. I'm the developer of Launchpane, a free, MIT-licensed Mac app that shows what starts on your Mac.

It lists launch agents (~/Library/LaunchAgents and /Library/LaunchAgents), launch daemons (/Library/LaunchDaemons), and login items that apps register, in one window with search and a source filter. For each one you can see whether it's loaded, running, or enabled, its PID, last exit status, logs, and schedule.

For your own agents you can load, run, stop, restart, enable, disable, create, and edit, with a preview of the next scheduled runs. Shared system plists stay read-only, and system daemons need an explicit administrator window. When an action isn't available, the menu says why. There's also a Commands tab with the equivalent launchctl commands.

No analytics, accounts, or cloud backend. Builds are Developer ID signed and notarized, for Apple silicon, Intel, and Universal:
https://github.com/webmaxru/Launchpane/releases/latest

It builds on azu's open-source launchd-ui. I'd love feedback, especially on anything that's confusing or that you expected to find and didn't.
```

## r/MacOS

Check whether the subreddit currently allows app promotion before posting. If it doesn't,
skip it, or answer relevant launchd questions there and mention Launchpane only when it
directly helps.

```reddit-title
A free, open-source way to see what launch agents, daemons, and login items are on your Mac
```

```reddit-body
I'm the developer, so take this with that in mind.

I made Launchpane because answering "what starts on this Mac, and is it working?" usually means checking several folders, System Settings, and launchctl. Launchpane lists launch agents, launch daemons, and app login items together, with status, last exit status, logs, and the plist or helper bundle behind each one. Reveal in Finder takes you straight to the file.

It's free and MIT-licensed, with signed and notarized builds for Apple silicon and Intel:
https://github.com/webmaxru/Launchpane

Happy to answer questions about launchd itself, too.
```

## r/opensource

```reddit-title
Launchpane: an MIT-licensed macOS app for launch agents, daemons, and login items (Tauri + Rust)
```

```reddit-body
Launchpane is an MIT-licensed macOS app for inspecting and managing launch agents, launch daemons, and login items. It builds on azu's open-source launchd-ui; I've since added login items, enable and disable, shared-agent and administrator controls, explanations for unavailable actions, read-back checks after state changes, a new design, and a signed and notarized release pipeline on GitHub Actions.

Source, issues, and releases: https://github.com/webmaxru/Launchpane

Contributions are welcome. The README covers building from source, tests (Vitest and cargo test), and the release pipeline.
```

## r/rust

Lead with the Rust and systems side; r/rust readers care how it works, not the pitch.

```reddit-title
Launchpane: a Tauri v2 app that wraps launchctl and checks its own work
```

```reddit-body
Launchpane is a macOS app for launch agents, daemons, and login items, built with Tauri v2. The Rust side runs launchctl through std::process::Command, parses plists with the plist crate, and discovers app login items inside their parent bundles.

A few things that were interesting to get right:

- A successful launchctl call doesn't guarantee the state you asked for; the owning app or another process can change a registration or enabled override. After load, unload, enable, and disable, the backend reads the state back and returns an error if it doesn't match.
- Domains matter: user agents live in gui/<uid>, daemons in system. The backend derives the domain from where the plist lives.
- Administrator mode relaunches the app through the standard macOS administrator prompt. Shared system plists stay read-only even as root.
- The Mac App Store build is compiled with a Cargo feature that removes service control, because the sandbox can't run launchctl; the backend rejects those commands even over direct IPC.

Source (MIT): https://github.com/webmaxru/Launchpane

Feedback on the Rust code is very welcome.
```

## r/tauri

```reddit-title
Launchpane: a signed and notarized Tauri v2 app for macOS launch agents and daemons
```

```reddit-body
Sharing a Tauri v2 app I maintain: Launchpane, a macOS app for launch agents, daemons, and login items. It builds on azu's launchd-ui.

Tauri-specific bits that might help others:

- Standalone builds for Apple silicon, Intel, and Universal are Developer ID signed and notarized on GitHub Actions.
- A separate Mac App Store build uses its own Tauri config and a Cargo feature that compiles out service control for the sandbox.
- Frontend tests run against a fake Tauri IPC layer instead of mocks.

Source (MIT): https://github.com/webmaxru/Launchpane

Happy to answer questions about the release pipeline or the Store build.
```
