# Communities, directories, and lists

These are slower channels than launch day, but they keep sending people for months. Space
them over the weeks after the launch. Each entry below was checked against the list's
contribution guide; read the current guide again before opening a PR, because rules change.

Ground rules for every channel:

- Say that you're the developer.
- Post where you already take part, and follow each community's self-promotion rules.
- Don't link Product Hunt from these channels, and never ask for votes, stars, or
  endorsements.
- Use the facts in `press-kit.md`. Don't add claims that aren't there.

## Curated lists (GitHub pull requests)

Open one PR per list, with one app per PR. Use a clear title such as
`Add Launchpane`.

### serhii-londar/open-source-mac-os-apps

Repository: https://github.com/serhii-londar/open-source-mac-os-apps

Edit `applications.json`, not `README.md`, as the guide asks. Use category ids from
`categories.json`, end the description with a period, and keep the PR to one app. Projects
without recent commits are ineligible.

```json
{
  "short_description": "Inspect and manage launch agents, launch daemons and login items, with status, logs and plists in one window.",
  "categories": ["system", "development"],
  "repo_url": "https://github.com/webmaxru/Launchpane",
  "title": "Launchpane",
  "icon_url": "https://raw.githubusercontent.com/webmaxru/Launchpane/main/src-tauri/icons/128x128.png",
  "screenshots": [
    "https://raw.githubusercontent.com/webmaxru/Launchpane/main/branding/store/screenshots/1280x800/overview.png",
    "https://raw.githubusercontent.com/webmaxru/Launchpane/main/branding/store/screenshots/1280x800/detail.png",
    "https://raw.githubusercontent.com/webmaxru/Launchpane/main/branding/store/screenshots/1280x800/logs.png"
  ],
  "official_site": "https://salnikov.no/projects/launchpane/",
  "languages": ["typescript", "rust"]
}
```

### jaywcjlove/awesome-mac

Repository: https://github.com/jaywcjlove/awesome-mac

Read `docs/CONTRIBUTING.md`. Add the line in alphabetical order in the section where
comparable apps live (Developer Tools → Developer Utilities is a likely fit), and add the
same entry to `README.md`, `README-zh.md`, `README-ja.md`, and `README-ko.md`, translating the
description.

```markdown
* [Launchpane](https://salnikov.no/projects/launchpane/) - Inspect and manage launch agents, launch daemons and login items. [![Open-Source Software][OSS Icon]](https://github.com/webmaxru/Launchpane) ![Freeware][Freeware Icon] [![App Store][app-store Icon]](https://apps.apple.com/app/id6820735995?platform=mac)
```

The App Store icon follows the list's convention for apps that are also on the Mac App Store.
Keep the main link on the website, which explains the difference between the two editions.

### iCHAIT/awesome-macOS

Repository: https://github.com/iCHAIT/awesome-macOS

Read `.github/contributing.md` and fill in the PR template; PRs without it are closed. The main
link points to the website and the OSS badge points to the source. Keep it alphabetical in
Utilities or Developers. New entries can wait for community endorsement; let that happen on
its own.

```markdown
- [Launchpane](https://salnikov.no/projects/launchpane/) - Inspect and manage launch agents, launch daemons and login items. [![Open-Source Software][OSS Icon]](https://github.com/webmaxru/Launchpane) ![Freeware][Freeware Icon]
```

### Not now

- **tauri-apps/awesome-tauri** currently has no applications section, so an app entry
  doesn't fit.
- **This Week in Rust** no longer accepts pull requests for Project/Tooling Updates. Its
  article sections expect human-written posts, so only submit a post you wrote yourself.

## Directories

- **AlternativeTo** (alternativeto.net): add Launchpane as a free, open-source macOS app and
  list it as an alternative to apps people search for, such as LaunchControl and Lingon. Keep
  the description factual; don't compare features you haven't checked. Add both download
  links, the signed GitHub release and the Mac App Store listing (https://apps.apple.com/no/app/launchpane/id6820735995?mt=12),
  and note that the Store edition doesn't control services.
- **Homebrew Cask**: Launchpane meets the technical bar (signed, notarized, published by the
  developer). Homebrew also requires notability: a self-submission by the repository owner
  needs at least 90 forks, 90 watchers, or 225 stars. Wait until the repository gets there,
  or until someone else asks for a cask. See https://docs.brew.sh/Acceptable-Casks and
  https://docs.brew.sh/Package-Acceptance-Policy.

## Communities

- **Tauri Discord** (https://discord.com/invite/tauri): share it in the channel the server
  uses for projects, following the pinned rules. Lead with what might help other Tauri
  developers: the signed and notarized release workflow and the separate Mac App Store build.
- **Reddit**: see `reddit.md`.
- **Hacker News**: see `hacker-news.md`.
- **Lobsters**: only if you're already a member. Use the `show` tag for your own work, and
  keep self-promotion a small part of your activity there.

## Articles

`article.md` is a draft about launchd that gives people something useful even if they never
install Launchpane. Rewrite it in your own voice before publishing; it's an outline, not a
finished post.

- Publish it first on a site you control, then cross-post to dev.to or Hashnode with the
  canonical URL set to the original.
- Link the GitHub repository rather than Product Hunt.
