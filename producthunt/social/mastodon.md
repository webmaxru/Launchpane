# Mastodon

Limit: 500 characters per post on most servers, with links counted as 23. Fenced
`mastodon-post` blocks are checked by `pnpm producthunt:verify`. Replace `<PH_LINK>` and
`<WEEKDAY>` before posting. Always add alt text to images; many people on Mastodon rely on it.

Mastodon discovery runs on hashtags, so each post ends with a few CamelCase tags.

## Before T-7 (optional): Mac App Store news

Post this a week or more before the teaser if you haven't announced the App Store release
yet. Image: `assets/gallery/07-download.png`

```mastodon-post
Launchpane is now on the Mac App Store.

It passed App Review and runs in Apple's App Sandbox: inspect launch agents, daemons, and login items, and edit your own plists. The sandbox rules out service controls, so for those I recommend the standalone download on GitHub, which is Developer ID signed and notarized by Apple.

App Store: https://apps.apple.com/no/app/launchpane/id6820735995?mt=12
GitHub: https://github.com/webmaxru/Launchpane/releases/latest

#macOS #OpenSource #MacApps
```

Alt text: Launchpane closing card with Apple's Download on the Mac App Store badge noted "Sandboxed · inspect and edit plists" and a Download from GitHub Releases button noted "Recommended · Developer ID signed · Apple notarized".

## T-7: teaser

Image: `assets/social/wide-teaser-1600x900.png`

```mastodon-post
Launchpane launches on Product Hunt next <WEEKDAY>.

It's a free, open-source Mac app for launch agents, launch daemons, and login items: one native window with status, logs, schedules, and the launchctl command behind each action.

MIT-licensed, Developer ID signed and notarized by Apple, and also on the Mac App Store:
https://github.com/webmaxru/Launchpane

#macOS #OpenSource #Rust #Tauri
```

## T-0: launch

Image: `assets/social/wide-live-1600x900.png`

```mastodon-post
Launchpane is live on Product Hunt today.

Know what starts on your Mac: launch agents, daemons, and login items in one window. Search and filter by source, read last exit status and logs, preview schedules, and copy the launchctl commands. Shared system plists stay read-only; daemons need an explicit administrator window.

No analytics, no accounts. Signed, notarized, and on the Mac App Store. Built on azu's launchd-ui.

<PH_LINK>

#macOS #OpenSource #Rust #Tauri #MacApps
```

## T+1: thank you

Image: `assets/social/wide-thanks-1600x900.png`

```mastodon-post
Thank you to everyone who tried Launchpane and asked questions during yesterday's Product Hunt launch.

I'm turning the feedback into GitHub issues now. Bug reports and ideas are welcome there any time:
https://github.com/webmaxru/Launchpane/issues

#macOS #OpenSource
```
