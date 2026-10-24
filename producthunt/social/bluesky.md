# Bluesky

Limit: 300 characters (graphemes) per post. Fenced `bluesky-post` blocks are checked by
`pnpm producthunt:verify`, which counts `<PH_LINK>` as 60 characters. Replace `<PH_LINK>`
and `<WEEKDAY>` before posting, and add the alt text when you attach an image.

## Before T-7 (optional): Mac App Store news

Post this a week or more before the teaser if you haven't announced the App Store release
yet. Image: `assets/gallery/07-download.png`

```bluesky-post
Launchpane is now on the Mac App Store: it passed App Review and runs sandboxed, for inspecting launch agents, daemons, and login items and editing your own plists.

For service control, get the signed, notarized download on GitHub.

https://apps.apple.com/no/app/launchpane/id6820735995?mt=12
```

Alt text: Launchpane closing card with Apple's Download on the Mac App Store badge noted "Sandboxed · inspect and edit plists" and a Download from GitHub Releases button noted "Recommended · Developer ID signed · Apple notarized".

## T-7: teaser

Image: `assets/social/wide-teaser-1600x900.png`

```bluesky-post
Launchpane launches on Product Hunt next <WEEKDAY>.

A free, open-source Mac app for launch agents, daemons, and login items: one native window with status, logs, schedules, and the launchctl commands behind each action.

Signed and notarized, and on the Mac App Store.
```

## T-0: launch thread

Post 1. Image: `assets/social/wide-live-1600x900.png`

```bluesky-post
Launchpane is live on Product Hunt today.

Know what starts on your Mac: launch agents, daemons, and login items in one native window. Free and MIT-licensed. Signed and notarized on GitHub, and on the Mac App Store.

<PH_LINK>
```

Post 2. Image: `assets/gallery/03-actions.png`

```bluesky-post
Actions explain themselves: if Load or Enable isn't available, the menu says why. Shared system plists stay read-only, and system daemons need an explicit administrator window.
```

Post 3. Images: `assets/gallery/04-logs.png`, `assets/gallery/06-commands.png`

```bluesky-post
Last exit status and stderr are one click away, and the Commands tab shows the launchctl command behind each action, ready to copy.

Built with Tauri and Rust on top of azu's launchd-ui. Questions welcome in the thread.
```

## T+1: thank you

Image: `assets/social/wide-thanks-1600x900.png`

```bluesky-post
Thank you to everyone who tried Launchpane and asked questions during yesterday's Product Hunt launch. I'm turning the feedback into GitHub issues now; ideas are welcome there any time.

github.com/webmaxru/Launchpane
```
