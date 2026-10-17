# First comment (maker)

Post this as the first comment the moment the launch goes live. It is written in the
maker's voice; adjust any sentence that does not sound like you before posting.

```ph-comment
Hi Product Hunt 👋 I'm Maxim, and I make Launchpane.

macOS keeps background work in several places: your own ~/Library/LaunchAgents, shared /Library/LaunchAgents, /Library/LaunchDaemons, and login items that apps register for themselves. System Settings shows part of that picture. launchctl shows the rest, if you remember the domain, the label, and which subcommand you need.

Launchpane puts all of it in one native window:

• Every source in one list, with search and a source filter
• Load, Run now, Stop, Restart, Enable, and Disable for your agents, with the reason shown when an action isn't available
• Last exit status and stdout/stderr logs for each service
• Create and edit agents, with a preview of the next scheduled runs
• The equivalent launchctl commands, ready to copy

A few boundaries I cared about:

• Shared system plists stay read-only, and system daemons need an explicit administrator window
• After a load, unload, enable, or disable, Launchpane reads the state back from launchd and tells you if it doesn't match
• No analytics, no accounts, no cloud backend

It's free and MIT-licensed. Builds are Developer ID signed and notarized, for Apple silicon, Intel, or Universal, on GitHub Releases. Launchpane builds on azu's open-source launchd-ui and the work of its contributors, and I'm grateful for that foundation.

I'd love to hear what you use launch agents for and what would make Launchpane more useful for you. Bugs and ideas are welcome here or in GitHub issues.
```

## Notes

- Do not ask for upvotes here or anywhere else. Asking for feedback is fine.
- The gallery and description already list features, so this comment focuses on why and
  how. Keep it under about 1,500 characters so it reads in one screen.
- If the Mac App Store edition is live on launch day, add one sentence before the last
  paragraph: "There's also a sandboxed Mac App Store edition for inspecting services and
  editing your own plists; the GitHub build is the one that controls services."
