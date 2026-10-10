<p align="center">
  <img src="branding/store/launchpane-wordmark-1600x400.png" alt="Launchpane" width="640">
</p>

# Launchpane

A native macOS app for managing launch agents, daemons and login items. Built with Tauri v2.

Browse user LaunchAgents (`~/Library/LaunchAgents/`), system agents/daemons, and app login items. Start, stop, restart, view/edit plist files, and create new agents.

## Features

- List User Agents (`~/Library/LaunchAgents/`), System Agents, System Daemons, and Login Items
- Search by label and filter by source (User / Home / System / Daemon / Login Items)
- Load / Run now / Stop (Unload) / Restart / Enable / Disable for user and shared GUI agents; administrator controls for system daemons
- Create new agents, edit and delete existing ones
- Schedule configuration (interval / calendar) with next run time preview
- View stdout / stderr logs
- Inspect plist configuration details
- Reveal plist file in Finder

In the standalone build, `/Library/LaunchAgents` can be controlled in the current
user's GUI session without root. `/Library/LaunchDaemons` require **Open
Administrator Window**. Shared system plist files remain protected from editing
and removal, including in administrator mode.

Login Items are the background helpers that apps register with macOS ServiceManagement
(`<App>.app/Contents/Library/LoginItems/<Helper>.app`). They have no plist file of their own, so the
supported actions are Enable / Disable and, while registered, Run now / Restart /
Unload. Load, Edit and Remove are hidden. Unloading requires confirmation because
only the parent app can register the helper again; Enable alone does not reload
it. A parent app may re-register its helper the next time it launches.

See the [standalone action availability tables](docs/native-actions.md) for every
action's privilege requirements, state dependencies, reasons for disabling or
hiding it, and real-Mac verification limits. Enable does not load or start;
Disable does not stop an already loaded service.

The Mac App Store edition has no administrator access: shared agents and daemons
are read-only, and login helpers retain Enable/Disable only. Edition-specific
limits stay visible with explanations and a project documentation/source link.
See the [App Store action and review-policy tables](docs/app-store-actions.md).

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
Universal builds are available as `Launchpane_universal.app.tar.gz` and a
versioned Universal DMG. Releases include `SHA256SUMS` for all six downloads.
These standalone builds are unsigned and unnotarized; they are separate from
the sandboxed Mac App Store edition.

## GitHub release pipeline

Pushing a `v<version>` tag runs **Standalone release**. The tag must match
`package.json`, both Rust version records, and `src-tauri/tauri.conf.json`.
The pipeline checks the frontend and both backend editions, then builds
Apple Silicon, Intel, and Universal standalone apps and DMGs. It verifies
bundle versions, CPU architectures, license inclusion, and DMG integrity,
packages the `.app` archives, and generates SHA-256 checksums.

Only after all builds succeed does it upload all seven assets to a draft
GitHub release and publish it as latest. A failed build publishes nothing;
a failed upload leaves a draft, never a partial public release. Signing keys
and App Store credentials are not needed or used.

To publish a subsequent version, bump the synchronized versions, commit all
intended app changes, push the commit, and push its matching version tag.
The workflow also supports manual dispatch with an existing tag. If a failed
publication left a draft, inspect and delete that draft before retrying;
the workflow does not overwrite existing releases.

**Publish to Mac App Store** is manual-only and is not triggered by standalone
tags. Its signing, upload, and review requirements remain separate.

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
pnpm store:screenshots  # render all accepted Mac App Store screenshot sizes
pnpm appstore:verify    # validate copy, versions, icons, and screenshots
pnpm appstore:prepare   # assemble Fastlane metadata and graphics
```

The complete credential-driven publishing flow is documented in
[`appstore/README.md`](appstore/README.md). The **Publish to Mac App Store**
workflow builds a universal binary, embeds the provisioning profile, signs the
app and installer, validates them with Apple, uploads all metadata and
screenshots, and can submit the version for review.

## License

Launchpane is released under the [MIT License](LICENSE), which is shipped inside
the application bundle at `Contents/Resources/LICENSE`.
