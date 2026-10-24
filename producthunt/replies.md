# Prepared replies

Starting points for common questions on launch day. Personalize each reply: answer the
person, then use only the facts below. If a question goes beyond these facts, say you will
check, and follow up in the thread or in a GitHub issue.

Rules for every reply:

- Thank people for specific feedback, not for votes. Never ask anyone to upvote.
- Be neutral about other apps. Do not describe a competitor's features or limits.
- Do not promise dates. "It's on my list" or "please open an issue so I can track it" is fine.
- Do not claim a minimum macOS version for the GitHub build. The screenshots were captured
  on macOS 12.7.6 on Apple silicon; ask people on other versions to report what they see.

## Is it really free? What's the business model?

```reply
Yes, it's free and MIT-licensed, with no paid tier, account, or in-app purchase. The source is on GitHub, and signed builds are on GitHub Releases.
```

## Is it in the Mac App Store?

```reply
Yes: https://apps.apple.com/no/app/launchpane/id6820735995?mt=12

It's a sandboxed inspector and personal plist editor. App Store restrictions mean no load, run, stop, restart, enable/disable, removal, or administrator mode. You select inventory and log folders again after reopening; saving a plist doesn't activate or reload its service. I recommend the signed, notarized standalone release on GitHub for service control.
```

## Is downloading outside the App Store safe?

```reply
The official standalone releases are Developer ID signed, so macOS can verify the developer and detect changes to the signed app. Apple notarization checks the submitted software for known malware, and our release pipeline verifies Gatekeeper acceptance. These are meaningful protections, not a guarantee of safety or the same as App Store review. Standalone has more access than the sandboxed Store edition and can change services, so review actions carefully. Use our official GitHub Releases, keep Gatekeeper enabled, and don't bypass malware, damaged-app, or unverified-developer warnings. Apple's explanation: https://support.apple.com/en-us/102445
```

## How is it different from LaunchControl, Lingon, or other launchd tools?

```reply
Those are established tools and worth trying. I won't speak for their feature sets, but here's what Launchpane focuses on: it's free and open source, it shows login items next to launchd jobs, it explains why an action isn't available instead of hiding it, and it shows the launchctl command behind each action so you can learn or script it.
```

## Doesn't System Settings already show login items?

```reply
It shows part of the picture. Launchpane lists launch agents, launch daemons, and app login items together, and for each one shows the source, status, enabled state, PID, last exit status, logs, and the plist or helper bundle behind it. Reveal in Finder takes you to the file.
```

## Can I break my Mac with this?

```reply
Launchpane is designed to keep boundaries clear. Shared system plists are read-only, including in administrator mode. System daemons need an explicit administrator window. Unloading a login item asks for confirmation, because only its parent app can register it again. After a load, unload, enable, or disable, Launchpane reads the state back from launchd and tells you if the result doesn't match. Your own agents in ~/Library/LaunchAgents are fully editable, so treat edits there like editing the plist by hand.
```

## Why does it ask for administrator access?

```reply
Only for system daemons in /Library/LaunchDaemons. macOS requires root to control those. When you choose Open Administrator Window, Launchpane asks for your password through the standard macOS administrator prompt and relaunches itself with administrator privileges; you opt in each time. Your own agents and shared agents in /Library/LaunchAgents work in your normal user session without root. Even in administrator mode, shared system plists can't be edited or removed.
```

## Does it collect data or phone home?

```reply
No. There are no analytics, ads, accounts, or cloud backend. The privacy page has the details: https://salnikov.no/projects/launchpane/privacy/
```

## Does it update itself?

```reply
The standalone edition has no built-in updater; new versions are on GitHub Releases. To hear about them, watch the repository and choose Custom → Releases. The Mac App Store handles updates for its edition.
```

## Intel or Apple silicon?

```reply
Both. Each release has Apple silicon, Intel, and Universal DMGs, plus .app archives and a SHA256SUMS file.
```

## Is it on Homebrew?

```reply
Not at the moment. The DMGs on GitHub Releases are signed and notarized, and each release includes SHA256SUMS so you can verify the download.
```

## Do Homebrew services show up?

```reply
`brew services start` writes a plist to ~/Library/LaunchAgents for services that run as your user, so those appear as user agents. You'll see their status, logs if the plist configures them, and the launchctl commands.
```

## Why Tauri and not Swift?

```reply
Launchpane is built with Tauri v2: a Rust backend that talks to launchctl and reads plists, and a React and TypeScript interface. It started from azu's open-source launchd-ui, which was already built with Tauri, and Rust is a good fit for the system side. It follows the system light or dark appearance and has keyboard shortcuts for search, refresh, and new agents.
```

## What do the keyboard shortcuts do?

```reply
/ focuses search, R refreshes the list, and N creates a new agent.
```

## Is it open source? Where did it come from?

```reply
Yes, MIT-licensed on GitHub. Launchpane builds on azu's open-source launchd-ui and its contributors, which already had the agent list, schedules, logs, the plist editor, and copyable launchctl commands. Since then I've added login items, enable and disable, shared-agent and administrator controls, reasons for unavailable actions, read-back checks after each action, a new design, and signed and notarized releases.
```

## Can you add <feature>?

```reply
Thanks, that's a useful idea. Could you open a GitHub issue with how you'd use it? That way I can track it and you'll see progress: https://github.com/webmaxru/Launchpane/issues
```

## It doesn't work on my Mac

```reply
Sorry about that, and thank you for trying it. Could you open an issue with your macOS version, Mac model (Apple silicon or Intel), Launchpane version, and what you saw? https://github.com/webmaxru/Launchpane/issues
```

## I found an agent I don't recognize. Is it malware?

```reply
Launchpane can't tell you that, and I'd rather it didn't guess. It shows the evidence: where the plist lives, what program it runs, whether it's loaded or running, and its logs. Reveal in Finder takes you to the file so you can look up its developer. If you're unsure, check with the developer of the related app before removing anything.
```
