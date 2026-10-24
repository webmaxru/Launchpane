# X (Twitter)

Limits: 280 weighted characters per post, links count as 23. Every fenced `x-post` block is
checked by `pnpm producthunt:verify`. Replace `<PH_LINK>` with the Product Hunt post URL and
`<WEEKDAY>` with the launch day before posting. Images are in `assets/`.

Do not ask for upvotes. Point people to the launch, invite questions, and answer them.

## Before T-7 (optional): Mac App Store news

Post this a week or more before the teaser if you haven't announced the App Store release
yet. Skip it if you have. Image: `assets/gallery/07-download.png`

```x-post
Launchpane is now on the Mac App Store.

It passed App Review and runs in Apple's App Sandbox: inspect launch agents, daemons, and login items, and edit your own plists.

For service control, get the signed, notarized download on GitHub.

https://apps.apple.com/no/app/launchpane/id6820735995?mt=12
```

Alt text: Launchpane closing card with the tagline "Know what starts on your Mac", Apple's Download on the Mac App Store badge noted "Sandboxed · inspect and edit plists", and a Download from GitHub Releases button noted "Recommended · Developer ID signed · Apple notarized".

## T-7: teaser

Image: `assets/social/wide-teaser-1600x900.png`

```x-post
Launchpane launches on Product Hunt next <WEEKDAY>.

It's a free, open-source Mac app that shows what starts on your Mac: launch agents, daemons, and login items in one native window, with logs and the launchctl commands behind each action.
```

Alt text: Launchpane card reading "Coming soon to Product Hunt. Know what starts on your Mac." above a screenshot of the app listing four demo launch agents.

## T-1: reminder

Image: `assets/social/wide-teaser-1600x900.png`

```x-post
Tomorrow at 12:01 AM Pacific, Launchpane launches on Product Hunt.

Launch agents, daemons, and login items in one native macOS window. Free and MIT-licensed: a signed, notarized download on GitHub, and on the Mac App Store.

I'll be answering questions in the thread all day.
```

## T-0, 12:01 AM PT: launch thread

Post 1. Image: `assets/social/wide-live-1600x900.png`

```x-post
Launchpane is live on Product Hunt today.

A free, open-source Mac app that shows what starts on your Mac: launch agents, daemons, and login items in one native window.

Signed and notarized on GitHub, and on the Mac App Store.

<PH_LINK>
```

Alt text: Launchpane card reading "Live on Product Hunt today. Know what starts on your Mac." above a screenshot of the app listing four demo launch agents.

Post 2. Image: `assets/gallery/02-sources.png`

```x-post
Every source in one list: your own agents, shared agents, system daemons, and login items that apps register for themselves.

Search by label or filter by source.
```

Post 3. Image: `assets/gallery/03-actions.png`

```x-post
Actions explain themselves. If Load or Enable isn't available, the menu says why instead of hiding it.

Shared system plists stay read-only, and system daemons need an explicit administrator window.
```

Post 4. Images: `assets/gallery/04-logs.png`, `assets/gallery/06-commands.png`

```x-post
When an agent fails, its last exit status and stderr are one click away.

The Commands tab shows the launchctl command behind each action, ready to copy, so you can learn it or script it.
```

Post 5. Image: `assets/gallery/07-download.png`

```x-post
Two ways to get it, both free and MIT-licensed: Developer ID signed, Apple-notarized builds on GitHub (Apple silicon, Intel, Universal) or the sandboxed Mac App Store edition. Built on azu's launchd-ui.

Questions and ideas are welcome in the thread:
<PH_LINK>
```

Alt text: Launchpane closing card with the tagline "Know what starts on your Mac", Apple's Download on the Mac App Store badge noted "Sandboxed · inspect and edit plists", and a Download from GitHub Releases button noted "Recommended · Developer ID signed · Apple notarized".

Pin post 1 for launch day.

## T-0, around 9 AM PT: feature highlight

Image: `assets/gallery/05-schedule.png`

```x-post
One Launchpane detail I rely on: when you create or edit an agent, it previews the next scheduled runs before you save, so a calendar interval does what you meant.

It's on Product Hunt today:
<PH_LINK>
```

## T-0, from the thread

Use only with a real question someone asked. Quote it briefly, answer it, and link back.

```x-post
Good question from the Product Hunt thread: does Launchpane collect any data?

No. No analytics, no accounts, no cloud backend. Details: salnikov.no/projects/launchpane/privacy/

<PH_LINK>
```

## T-0, around 6 PM PT: last hours

```x-post
The last few hours of Launchpane's Product Hunt launch day. I'm still in the thread answering questions, and every bug report helps.

<PH_LINK>
```

## T+1: thank you

Image: `assets/social/wide-thanks-1600x900.png`

```x-post
Thank you to everyone who tried Launchpane, asked questions, and filed issues during yesterday's Product Hunt launch.

Next: working through that feedback on GitHub. Issues and ideas are welcome there any time.

github.com/webmaxru/Launchpane
```

Alt text: Launchpane icon with a pulse line across the card, reading "Thank you, Product Hunt" and "Free and open source. Issues and ideas are welcome on GitHub."
