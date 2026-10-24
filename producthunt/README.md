# Product Hunt launch kit

Everything for launching Launchpane on Product Hunt: the listing, the maker comment, replies,
posts for each channel, images, a launch-day plan, a video script, and a press kit. Every
product claim here was checked against the code, the website, or the v1.3.4 release. If the
app changes before launch, recheck the copy that describes it.

Start with [`launch-plan.md`](launch-plan.md). Its first section lists repository settings to
fix before launch, including turning GitHub Issues on.

## What's here

| Path | Use it for |
| --- | --- |
| [`launch-plan.md`](launch-plan.md) | Checklist from T-14 to T+7, launch-day schedule, time zones, metrics |
| [`listing.md`](listing.md) | Product Hunt form fields in the order the form asks for them |
| `listing.json` | The same listing as data. `verify.mjs` keeps it in sync with `listing.md` |
| [`first-comment.md`](first-comment.md) | Maker comment to post the moment the launch goes live |
| [`replies.md`](replies.md) | Factual answers to the questions people are likely to ask |
| [`press-kit.md`](press-kit.md) | Boilerplate, facts, links, credits, and image list for writers |
| [`video-script.md`](video-script.md) | Storyboard for an optional 70-second demo video |
| [`social/`](social/) | Posts for X, LinkedIn, Bluesky, Mastodon, Threads, Reddit, and Hacker News; email and DM templates; directory submissions; an article draft |
| `assets/gallery/` | Seven Product Hunt gallery images, 2540×1520 |
| `assets/thumbnail/` | Animated 240×240 thumbnail, a static fallback, and the 1024 px icon |
| `assets/social/` | Teaser, launch, and thank-you cards sized for each network |
| `assets/frames.js`, `assets/templates/` | Layouts and text for every image |
| `capture/` | Native app screenshots, their provenance in `capture/captures.json`, and the demo agents script |
| `render.mjs`, `lib.mjs` | Render the images from the captures |
| `verify.mjs` | Check the copy, listing, and images before you post |

## Before you post

Fill these placeholders. `verify.mjs` fails on any placeholder it doesn't recognize, so a
typo can't slip through.

| Placeholder | Replace with | Known |
| --- | --- | --- |
| `<PH_LINK>` | The Product Hunt post URL | When you schedule the launch |
| `<WEEKDAY>` | The launch day, for example "Tuesday" | When you pick the date |
| `<POST_ID>` | The numeric post ID for the Product Hunt badge | After the launch is scheduled |
| `<NAME>`, `<PUBLICATION>` | The person or outlet you're writing to | Per message |

Edition guidance and publishing notes:

- **Mac App Store edition.** [Available now](https://apps.apple.com/no/app/launchpane/id6820735995?mt=12)
  for inspection and personal plist editing, with sandbox limits. Recommend the signed,
  notarized standalone release for service control. The listing, maker comment, and
  replies distinguish the editions; gallery images show standalone.
- **Article.** `social/article.md` is a researched draft, not a finished post. Rewrite it in
  your own voice before publishing; some communities reject machine-written articles.
- **Press kit link.** Messages link to `producthunt/press-kit.md` on `main`, so merge this
  folder before sending them.

Never ask for upvotes, on any channel. Ask people to try the app and say what they think.
The plan and the per-channel notes explain why.

## Commands

```sh
pnpm producthunt:verify   # check copy, listing, images, and capture checksums
pnpm producthunt:assets   # re-render every image in assets/
node producthunt/render.mjs gallery-2-sources   # re-render selected frame ids
```

`producthunt:verify` checks:

- Each fenced post block against its network's limit. X uses weighted length with links
  counted as 23 characters; `<PH_LINK>` counts as 60 on Bluesky and Threads, where the URL
  counts as typed.
- That Reddit and Hacker News copy never mentions or links Product Hunt.
- That no post asks for votes.
- That the press kit boilerplate stays near 25, 50, and 100 words.
- That every backticked file path in the copy exists.
- That `listing.json` and `listing.md` agree, and the tagline (60) and description (260)
  fit.
- Image sizes, Product Hunt's 3 MB limit, the animated thumbnail, and the sha256 of each
  capture.

Post blocks use these fence names, so the verifier knows which limit applies: `x-post`,
`linkedin-post`, `bluesky-post`, `mastodon-post`, `threads-post`, `reddit-title`,
`reddit-body`, `hn-title`, `hn-text`, `hn-reply`, `ph-comment`, `reply`, `email`, `dm`, and
`boilerplate`. Copy the text inside the fence, not the fence itself.

`producthunt:assets` needs macOS, Google Chrome or Microsoft Edge, and ffmpeg for the GIF.
To change an image, edit its text or layout in `assets/frames.js` (styles live in
`assets/templates/frames.html`), re-render, then run the verifier.

## Recapturing screenshots

The captures come from the signed v1.3.4 universal DMG, using disposable demo agents so no
real services appear. `capture/captures.json` records the release, its checksum, the macOS
version, and what each screenshot shows. To recapture after the UI changes:

1. Install the current release, then create the demo agents:
   `zsh producthunt/capture/demo-agents.sh up`. They are labelled `com.launchpane.demo.*`
   and write only to `/tmp/launchpane-demo`.
2. Size the window to 1200×750 points, filter the list to `com.launchpane.demo`, and capture
   each screen with `screencapture -o -l <window id>` on a Retina display.
3. Remove the demo agents: `zsh producthunt/capture/demo-agents.sh down`.
4. Replace the files in `capture/`, update the version, checksums, and descriptions in
   `capture/captures.json`, then run `pnpm producthunt:assets` and `pnpm producthunt:verify`.
