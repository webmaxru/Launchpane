<p align="center">
  <img src="branding/store/launchpane-wordmark-1600x400.png" alt="Launchpane" width="640">
</p>

# Launchpane

A native macOS app for managing launch agents, daemons and login items. Built with Tauri v2.

Browse user LaunchAgents (`~/Library/LaunchAgents/`), system agents/daemons, and app login items. Start, stop, restart, view/edit plist files, and create new agents.

## Features

- List User Agents (`~/Library/LaunchAgents/`), System Agents, System Daemons, and Login Items
- Search by label and filter by source (User / Home / System / Daemon / Login Items)
- Start / Stop / Restart / Test Run (immediate execution) for User Agents
- Create new agents, edit and delete existing ones
- Schedule configuration (interval / calendar) with next run time preview
- View stdout / stderr logs
- Inspect plist configuration details
- Reveal plist file in Finder

System Agents and Daemons are read-only. Modification operations are limited to User Agents.

Login Items are the background helpers that apps register with macOS ServiceManagement
(`<App>.app/Contents/Library/LoginItems/<Helper>.app`). They have no plist file of their own, so the
only supported action is Enable / Disable; load, unload, run and remove controls are intentionally
left empty for them. A parent app may re-register its helper the next time it launches.

## Install

This app is not code-signed. Download and install via CLI:

```bash
# Download and extract (Apple Silicon)
curl -L "https://github.com/webmaxru/Launchpane/releases/latest/download/Launchpane_aarch64.app.tar.gz" | tar xz -C /Applications
# Remove quarantine attribute (required for unsigned apps)
xattr -cr /Applications/Launchpane.app
```

For Intel Macs, replace `aarch64` with `x64`.

DMG installers are also available on the [Releases](https://github.com/webmaxru/Launchpane/releases) page.

## Tech Stack

- Tauri v2 (Rust backend) + React + TypeScript + Vite
- UI: Tailwind CSS v4 + shadcn/ui
- Lint: oxlint (TypeScript), cargo clippy + rustfmt (Rust)
- Test: vitest (Frontend), cargo test (Rust)
- Package manager: pnpm

## Development

```bash
# Install dependencies
pnpm install

# Dev mode (launches app with hot reload)
pnpm tauri:dev

# Frontend only
pnpm dev

# Production build (DMG)
pnpm tauri:build
```

### Building a launchable `.app`

To get a double-clickable app bundle instead of the hot-reload dev window:

```bash
# Rebuild the release .app on every source change (recommended)
pnpm app:watch

# Build the release .app once
pnpm app:build

# Open the most recent release bundle
pnpm app:open
```

`pnpm app:watch` watches `src/`, `src-tauri/src/`, `src-tauri/capabilities/`,
`src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `index.html`,
`vite.config.ts` and `tsconfig.json`. Changes are debounced, builds are
serialized, and `*.test.*` / `*.spec.*` files are ignored. The bundle is
written to:

```
src-tauri/target/release/bundle/macos/Launchpane.app
```

Quit and relaunch the app to pick up a new build — the bundle is replaced in
place, so a running instance keeps the old code.

The default commands above already build the optimized release bundle. For
debug builds, use:

```bash
pnpm app:build:debug
pnpm app:watch:debug
```

Do not run `pnpm tauri:dev` at the same time as `pnpm app:watch` — both drive
`cargo` against `src-tauri/target`, and they will block on the same build lock.

## Testing / Lint

```bash
pnpm test          # vitest (frontend)
pnpm lint          # oxlint
pnpm typecheck     # TypeScript type check

cargo test --manifest-path src-tauri/Cargo.toml          # Rust tests
cargo fmt --manifest-path src-tauri/Cargo.toml --check   # Rust format check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings  # Rust lint
```

## Brand & App Store assets

App icon, wordmark and the Mac App Store graphics package live in [`branding/`](branding/).
See [`branding/README.md`](branding/README.md) for the palette, deliverables and the
submission checklist.

```bash
pnpm store:icons        # regenerate src-tauri/icons from the master artwork
pnpm store:screenshots  # render App Store screenshot sizes from raw captures
```

## License

Launchpane is released under the [MIT License](LICENSE).

Launchpane is an independent derivative of an MIT-licensed upstream project by
[azu](https://github.com/azu) and its contributors. The upstream copyright notice is
preserved in [`LICENSE`](LICENSE) and the attribution details are recorded in
[`NOTICE`](NOTICE). The upstream authors do not endorse or support this project.
