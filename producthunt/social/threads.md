# Threads

Limit: 500 characters per post. Fenced `threads-post` blocks are checked by
`pnpm producthunt:verify`, which counts `<PH_LINK>` as 60 characters. Replace `<PH_LINK>`
and `<WEEKDAY>` before posting.

## Before T-7 (optional): Mac App Store news

Post this a week or more before the teaser if you haven't announced the App Store release
yet. Image: `assets/gallery/07-download.png`

```threads-post
Launchpane is now on the Mac App Store.

It passed App Review and runs in Apple's App Sandbox, so you can inspect launch agents, daemons, and login items and edit your own plists. For service control, I recommend the signed, notarized download on GitHub.

https://apps.apple.com/no/app/launchpane/id6820735995?mt=12
```

## T-7: teaser

Image: `assets/social/square-teaser-1080x1080.png`

```threads-post
Launchpane launches on Product Hunt next <WEEKDAY>.

It's a free, open-source Mac app that shows what starts on your Mac: launch agents, daemons, and login items in one native window, with status, logs, and the launchctl commands behind each action.

Free and MIT-licensed: signed and notarized on GitHub, and on the Mac App Store.
```

## T-0: launch

Image: `assets/social/square-live-1080x1080.png`

```threads-post
Launchpane is live on Product Hunt today.

Know what starts on your Mac. Launch agents, daemons, and login items in one window, with last exit status, logs, schedule previews, and copyable launchctl commands. Unavailable actions say why, and shared system files stay read-only.

Free and MIT-licensed. Signed and notarized on GitHub, and on the Mac App Store. Questions welcome in the thread:
<PH_LINK>
```

## T+1: thank you

Image: `assets/social/wide-thanks-1600x900.png`

```threads-post
Thank you to everyone who tried Launchpane and asked questions during yesterday's Product Hunt launch. I'm turning the feedback into GitHub issues now, and ideas are welcome there any time: github.com/webmaxru/Launchpane
```

## Instagram story (optional)

Use `assets/social/story-live-1080x1920.png` and add a link sticker to `<PH_LINK>`. The brand
and headline start below the top 220 px, clear of the story header. Place the link sticker
over the empty log area in the lower part of the image.
