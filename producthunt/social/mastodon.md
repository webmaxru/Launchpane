# Mastodon

Limit: 500 characters per post on most servers, with links counted as 23. Fenced
`mastodon-post` blocks are checked by `pnpm producthunt:verify`. Replace `<PH_LINK>` and
`<WEEKDAY>` before posting. Always add alt text to images; many people on Mastodon rely on it.

Mastodon discovery runs on hashtags, so each post ends with a few CamelCase tags.

## T-7: teaser

Image: `assets/social/wide-teaser-1600x900.png`

```mastodon-post
Launchpane launches on Product Hunt next <WEEKDAY>.

It's a free, open-source Mac app for launch agents, launch daemons, and login items: one native window with status, logs, schedules, and the launchctl command behind each action.

MIT-licensed, Developer ID signed and notarized, for Apple silicon and Intel:
https://github.com/webmaxru/Launchpane

#macOS #OpenSource #Rust #Tauri
```

## T-0: launch

Image: `assets/social/wide-live-1600x900.png`

```mastodon-post
Launchpane is live on Product Hunt today.

Know what starts on your Mac: launch agents, daemons, and login items in one window. Search and filter by source, read last exit status and logs, preview schedules, and copy the launchctl commands. Shared system plists stay read-only; daemons need an explicit administrator window.

No analytics, no accounts. Built on azu's launchd-ui.

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
