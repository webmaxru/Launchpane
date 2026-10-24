# Launch plan

A checklist from two weeks before the Product Hunt launch to a week after. The copy and
images it refers to are in this folder; `README.md` has the folder map.

Principles for every step:

- Ask people to try the app and share honest feedback. Never ask for upvotes, on any
  channel. Product Hunt discounts coordinated voting, and it isn't how this product talks.
- Answer every question with facts from `replies.md`, `press-kit.md`, or the code. If
  something isn't known yet, say so.
- Credit azu's launchd-ui wherever you describe where Launchpane came from.

## Blockers to clear first

These are repository settings. Nothing in this folder changes them for you.

- [ ] **Turn on GitHub Issues** (Settings → General → Features). They are currently
      disabled, but the support page, the maker comment, `replies.md`, and several posts send
      people to the issue tracker.
- [ ] **Set the repository homepage** to `https://salnikov.no/projects/launchpane/`. It
      currently points to `https://webmaxru.github.io/Launchpane/`, which redirects to the
      site.
- [ ] **Add topics** so people can find the repository from GitHub search: `macos`, `launchd`,
      `launchctl`, `launch-agents`, `login-items`, `tauri`, `rust`.
- [ ] **Credit upstream in the README.** The LICENSE credits azu's launchd-ui, but the README
      doesn't mention it. A sentence near the top, such as "Launchpane builds on
      [azu/launchd-ui](https://github.com/azu/launchd-ui) and the work of its contributors",
      matches what the launch copy says.

## T-14: prepare

- [ ] Pick a launch date. Weekdays bring more visitors and more competing launches; weekends
      bring fewer of both. Avoid days when you can't stay online.
- [ ] Decide whether you hunt it yourself. Self-hunting is normal for makers.
- [ ] Complete your Product Hunt maker profile: photo, headline, and links.
- [ ] Download the latest release on a Mac that has never run Launchpane. Check that each DMG
      opens without Gatekeeper warnings and that `SHA256SUMS` matches.
- [ ] Recheck the [live Mac App Store listing](https://apps.apple.com/no/app/launchpane/id6820735995?mt=12).
      Keep the edition comparison in `first-comment.md` and `replies.md`: Store is for
      inspection and personal plist editing; standalone is recommended for service control.
- [ ] Regenerate and check the assets:

  ```sh
  pnpm producthunt:assets
  pnpm producthunt:verify
  ```

## T-7: announce

- [ ] Create the Product Hunt post from `listing.md`: name, tagline, description, topics,
      thumbnail, gallery in order, links, and pricing (Free).
- [ ] Schedule it for 12:01 AM Pacific Time on launch day.
- [ ] Copy the upcoming page URL and replace `<PH_LINK>` in the posts you'll use.
- [ ] Post the T-7 teasers: `social/x.md`, `social/linkedin.md`, `social/bluesky.md`,
      `social/mastodon.md`, `social/threads.md`.
- [ ] If you'll make a video, record it now from `video-script.md`.

## T-1: final check

- [ ] Preview the scheduled post. Check that the thumbnail animates, the gallery is in order,
      captions are right, and every link opens.
- [ ] Confirm the latest release is still the one you tested.
- [ ] Replace `<WEEKDAY>` and post the X reminder.
- [ ] Have `first-comment.md` and `replies.md` open for the morning.
- [ ] Set an alarm for the launch time below.

## T-0: launch day

Product Hunt days run from 12:01 AM to 11:59 PM Pacific Time. The tables below use Central
European Time (Europe/Oslo); adjust if you'll be elsewhere. The US and Europe change clocks on
different weekends, so check the offset for your date.

| Launch date (2026) | Pacific | Central Europe | Launch goes live, Central Europe |
| --- | --- | --- | --- |
| Until 24 Oct | PDT (UTC−7) | CEST (UTC+2) | 09:01 |
| 25–31 Oct | PDT (UTC−7) | CET (UTC+1) | 08:01 |
| From 1 Nov | PST (UTC−8) | CET (UTC+1) | 09:01 |

The schedule below uses the usual 9-hour difference. Subtract an hour on the Central Europe
side between 25 and 31 October.

| Pacific | Central Europe | What to do | Copy |
| --- | --- | --- | --- |
| 00:01 | 09:01 | Check the post is live. Post the maker comment right away. | `first-comment.md` |
| 00:15 | 09:15 | Post the launch posts and pin the X thread. | `social/*.md`, T-0 |
| 00:30 | 09:30 | Send personal notes, one person at a time. | `social/email-dm.md` |
| 00:30–09:00 | 09:30–18:00 | Reply to every comment within an hour or so. Thank people specifically. | `replies.md` |
| 09:00 | 18:00 | Post the feature highlight on X. | `social/x.md` |
| During the day | | Turn a good question from the thread into a post, with permission if it quotes someone. | `social/x.md`, from the thread |
| 18:00 | 03:00 (+1) | Optional "last hours" post if you're awake; schedule it in advance if not. | `social/x.md` |
| 23:59 | 08:59 (+1) | The Product Hunt day ends. | |

Things to avoid on the day:

- Don't post the Product Hunt link on Hacker News or Reddit. Their audiences and rules are
  different; see `social/hacker-news.md` and `social/reddit.md` for later days.
- Don't send the same message to groups or mailing lists.
- Don't change the release while the launch is running unless a serious bug forces it. The
  download link points to `releases/latest`, so a fixed release reaches new visitors
  automatically. There's no auto-updater, so tell people who already downloaded.

If a bug is reported:

1. Thank them and ask for the details in the bug-report reply in `replies.md`.
2. Reproduce it. If it's real, say so in the thread, and say when you expect a fix only if
   you're confident.
3. Ship the fix through the normal release workflow, then reply in the thread with the
   version number.

## T+1: thank and record

- [ ] Post the thank-you posts (`social/*.md`, T+1) and send the thank-you emails.
- [ ] Reply to any comments that came in overnight.
- [ ] Record the numbers below while they're fresh.
- [ ] If Product Hunt shows a badge for the launch, add it to the README and website. Copy
      the embed code from your Product Hunt dashboard; it will look like this, with your post
      id:

  ```html
  <a href="https://www.producthunt.com/posts/launchpane?utm_source=badge-featured&utm_medium=badge" target="_blank" rel="noopener">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=<POST_ID>&theme=light" alt="Launchpane on Product Hunt" width="250" height="54">
  </a>
  ```

## T+2 to T+7: keep going

- [ ] Show HN on a different day from the launch: `social/hacker-news.md`.
- [ ] Reddit, one subreddit per day at most: `social/reddit.md`.
- [ ] Curated lists and directories: `social/communities.md`.
- [ ] Publish the article after rewriting it in your own voice: `social/article.md`.
- [ ] Triage the issues from launch week and reply to each one.
- [ ] Record the numbers again at T+7.

## Measuring

Product Hunt adds `ref=producthunt` to outbound links, and the website has no analytics, so
measure on GitHub. Run these before the launch for a baseline, then at T+1 and T+7.

```sh
# Stars, forks, watchers, open issues
gh api repos/webmaxru/Launchpane \
  --jq '{stars: .stargazers_count, forks: .forks_count, watchers: .subscribers_count, issues: .open_issues_count}'

# Total downloads of DMG and app archives across all releases
gh api repos/webmaxru/Launchpane/releases \
  --jq '[.[].assets[] | select(.name | test("\\.(dmg|tar\\.gz)$")) | .download_count] | add'

# Repository page views for the last 14 days (needs push access)
gh api repos/webmaxru/Launchpane/traffic/views --jq '{count, uniques}'

# Where visitors came from, including producthunt.com
gh api repos/webmaxru/Launchpane/traffic/popular/referrers
```

GitHub keeps traffic data for 14 days, so save the T+1 output somewhere.

| | Baseline | T+1 | T+7 |
| --- | --- | --- | --- |
| Stars | | | |
| Forks | | | |
| Downloads (all releases) | | | |
| Views / unique visitors (14 days) | | | |
| Visitors from producthunt.com | | | |
| Product Hunt comments | | | |
| Issues opened | | | |
