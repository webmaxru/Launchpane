# Developing Launchpane

How to build, run, and test Launchpane from source. For signed releases, Mac
App Store publishing, and website deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).
For what the app does, start with the [README](README.md).

## Tech stack

- Tauri v2 (Rust backend) + React + TypeScript + Vite
- UI: Tailwind CSS v4 + shadcn/ui
- Lint: oxlint (TypeScript), cargo clippy + rustfmt (Rust)
- Test: vitest (frontend), cargo test (Rust)
- Package manager: pnpm

Launchpane is built on [azu/launchd-ui](https://github.com/azu/launchd-ui).

## Project structure

| Path | Contents |
| --- | --- |
| `src-tauri/src/` | Rust backend: launchctl wrapper, plist parsing, login items, Tauri commands |
| `src/` | React frontend |
| `src/components/ui/` | Generated shadcn/ui components; do not edit by hand |
| `src/lib/invoke.ts` | Typed Tauri invoke wrappers |
| `src/test-utils/tauri-mock.ts` | Fake Tauri IPC used by frontend tests |
| `docs/` | Product website source |
| `branding/` | Icon, wordmark, screenshots, and Store graphics |
| `appstore/`, `fastlane/` | Mac App Store metadata, policy notes, and upload tooling |

## Getting started

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

`cargo tauri` is not available; use `pnpm tauri` or `pnpm exec tauri`. If
cargo cannot find your toolchain, set `RUSTUP_HOME="$HOME/.rustup"`.

## Building a launchable `.app`

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

## Testing and linting

```bash
pnpm test          # vitest (frontend)
pnpm lint          # oxlint
pnpm typecheck     # TypeScript type check

cargo test --manifest-path src-tauri/Cargo.toml          # Rust tests
cargo fmt --manifest-path src-tauri/Cargo.toml --check   # Rust format check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings  # Rust lint
```

Frontend tests use a fake Tauri IPC layer (`src/test-utils/tauri-mock.ts`)
instead of mocks. Vitest aliases `@tauri-apps/api/core` to it; use
`setFakeHandler()` and `resetFakeHandlers()` to customize behavior per test.

Conventions: TypeScript uses `type`, not `interface`. Project language
(README, commits, comments) is English.

## Product website

Source pages and assets for the [Launchpane website](https://salnikov.no/projects/launchpane/)
live in `docs/`.

- `pnpm site:test` checks the dependency-free website builder.
- `pnpm site:build` validates local links, assets, and anchors, then writes
  the deployable site to `dist/site/`.
- `pnpm site:assets` regenerates the favicon, touch/PWA icons, and the 1200×630
  social card (`docs/assets/og-image.png`) from `branding/`. It needs macOS
  and Google Chrome or Microsoft Edge. Edit the card in
  `branding/social/og.html`.

Publishing is covered in [DEPLOYMENT.md](DEPLOYMENT.md#product-website).

## Brand and App Store assets

App icon, wordmark and the Mac App Store graphics package live in [`branding/`](branding/).
See [`branding/README.md`](branding/README.md) for the palette and deliverables.

```bash
pnpm store:icons        # regenerate src-tauri/icons from the master artwork
pnpm store:screenshots  # render all accepted Mac App Store screenshot sizes
pnpm appstore:verify    # validate copy, versions, icons, and screenshots
pnpm appstore:prepare   # assemble Fastlane metadata and graphics
```

## Standalone and Store editions

The same source builds two editions. The standalone build controls services;
the sandboxed Mac App Store build is an inspector and personal plist editor.
See [standalone actions](docs/native-actions.md) and the
[edition comparison](docs/app-store-actions.md) before changing any action.
