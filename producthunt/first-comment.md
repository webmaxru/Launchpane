# First comment (maker)

Post this as the first comment the moment the launch goes live. It is written in the
maker's voice; adjust any sentence that does not sound like you before posting.

```ph-comment
Hi Product Hunt 👋 I'm Maxim, and I make Launchpane.

macOS keeps background work in several places: your own ~/Library/LaunchAgents, shared /Library/LaunchAgents, /Library/LaunchDaemons, and login items that apps register for themselves. System Settings shows part of that picture. launchctl shows the rest, if you remember the domain, the label, and which subcommand you need.

The standalone edition puts it in one native window:

• Every source in one list, with search and a source filter
• Load, Run now, Stop, Restart, Enable, and Disable for your agents, with the reason shown when an action isn't available
• Last exit status and stdout/stderr logs for each service
• Create and edit agents, with a preview of the next scheduled runs
• The equivalent launchctl commands, ready to copy

A few boundaries I cared about:

• Shared system plists stay read-only, and system daemons need an explicit administrator window
• After a load, unload, enable, or disable, Launchpane reads the state back from launchd and tells you if it doesn't match
• No analytics, no accounts, no cloud backend

There are two ways to get it, both free and MIT-licensed:

• GitHub Releases (recommended): Developer ID signed and notarized by Apple, built by a public GitHub Actions workflow that checks Gatekeeper acceptance before publishing, with SHA256SUMS for every download
• Mac App Store: passed App Review and runs in Apple's App Sandbox. It inspects services and edits your own plists, but the sandbox rules out service controls, removal, and administrator mode

Launchpane builds on azu's open-source launchd-ui and its contributors. I'm grateful for that foundation.

I'd love to hear what you use launch agents for and what would make Launchpane more useful for you. Bugs and ideas are welcome here or in GitHub issues.
```

## Notes

- Do not ask for upvotes here or anywhere else. Asking for feedback is fine.
- The gallery and description already list features, so this comment focuses on why and
  how. Keep the edition distinction when shortening it.
- Both download links are in `listing.md`. Do not attach service-control claims to the
  Store link; use the standalone release for those.
- Signing, notarization, and App Review are trust signals, not endorsements. Say the Store
  build passed App Review; never say Apple approved, endorsed, or recommends Launchpane.
  Notarization is not App Review, so keep the two apart.
