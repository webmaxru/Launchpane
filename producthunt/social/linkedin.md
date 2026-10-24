# LinkedIn

Limit: 3,000 characters per post. Fenced `linkedin-post` blocks are checked by
`pnpm producthunt:verify`. Replace `<PH_LINK>` and `<WEEKDAY>` before posting.

Attach the image yourself rather than relying on the link preview, and keep the link in the
text.

## Before T-7 (optional): Mac App Store news

Post this a week or more before the teaser if you haven't announced the App Store release
yet. Image: `assets/gallery/07-download.png`

```linkedin-post
Launchpane is now on the Mac App Store.

Launchpane is my free, open-source macOS app for the background work that starts on your Mac: launch agents, launch daemons, and login items. The Mac App Store edition passed App Review and runs in Apple's App Sandbox. You can inspect services, read their configuration, and edit your own plists:
https://apps.apple.com/no/app/launchpane/id6820735995?mt=12

The sandbox is also its limit. It can't load, run, stop, enable, or disable services, and it has no administrator mode. For those, I recommend the standalone download on GitHub. It's Developer ID signed and notarized by Apple, built by a public GitHub Actions workflow that checks Gatekeeper acceptance before publishing, and every release ships with SHA256SUMS:
https://github.com/webmaxru/Launchpane/releases/latest

Two ways to get the same app, both free and MIT-licensed. Pick the one that fits how you work.

#macOS #OpenSource #DeveloperTools
```

## T-7: teaser

Image: `assets/social/linkedin-teaser-1200x627.png`

```linkedin-post
Next <WEEKDAY>, I'm launching Launchpane on Product Hunt.

Launchpane is a free, open-source macOS app for the background work that starts on your Mac: launch agents, launch daemons, and the login items that apps register for themselves.

On macOS, that work lives in several places. Some of it appears in System Settings; the rest you find with launchctl, if you remember the domain, the label, and the right subcommand. Launchpane puts it in one native window, with status, logs, schedules, and the launchctl command behind each action.

It's MIT-licensed. The standalone download on GitHub is Developer ID signed and notarized by Apple, for Apple silicon and Intel:
https://github.com/webmaxru/Launchpane

A sandboxed edition for inspection and plist editing is on the Mac App Store:
https://apps.apple.com/no/app/launchpane/id6820735995?mt=12

#macOS #OpenSource #DeveloperTools
```

## T-0: launch

Image: `assets/social/linkedin-live-1200x627.png`

```linkedin-post
Launchpane is live on Product Hunt today.

It's a free, open-source macOS app that answers a simple question: what starts on my Mac, and why?

Launchpane lists launch agents, launch daemons, and app login items in one window. For each one you can see:

→ where it comes from and whether it's loaded, running, or enabled
→ its last exit status and its stdout and stderr logs
→ its schedule, with a preview of the next runs
→ the launchctl commands behind each action, ready to copy

For your own agents, you can load, run, stop, restart, enable, disable, create, and edit. Shared system plists stay read-only, and system daemons need an explicit administrator window. When an action isn't available, Launchpane tells you why. After a load, unload, enable, or disable, it reads the state back from launchd and tells you if the result doesn't match.

There are no analytics, accounts, or cloud backend.

There are two ways to get it, both free:
→ The standalone download on GitHub, recommended for service control. It's Developer ID signed and notarized by Apple, built by a public GitHub Actions workflow, and available for Apple silicon, Intel, or Universal: https://github.com/webmaxru/Launchpane/releases/latest
→ The Mac App Store edition, which passed App Review and runs in Apple's App Sandbox. It inspects services and edits your own plists, without service controls: https://apps.apple.com/no/app/launchpane/id6820735995?mt=12

Launchpane builds on azu's open-source launchd-ui and the work of its contributors. It's built with Tauri, Rust, React, and TypeScript.

I'll be in the Product Hunt thread all day. I'd love to hear what you use launch agents for and what would make Launchpane more useful:
<PH_LINK>

#macOS #OpenSource #DeveloperTools #Rust #Tauri
```

## T+1: thank you

Image: `assets/social/wide-thanks-1600x900.png`

```linkedin-post
Thank you to everyone who tried Launchpane, asked questions, and reported issues during yesterday's Product Hunt launch.

The questions were the best part: they showed me where the app is clear and where it still needs work. I'm turning that feedback into GitHub issues now, and ideas are welcome there any time:
https://github.com/webmaxru/Launchpane/issues

#macOS #OpenSource
```

Before posting the thank-you, check that the second paragraph matches what happened. Rewrite
it if the feedback was different.
