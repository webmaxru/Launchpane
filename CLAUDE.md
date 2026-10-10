# Launchpane

A native macOS app for managing launch agents, daemons and login items (Tauri v2)

## Tech Stack

- Tauri v2 (Rust backend) + React + TypeScript + Vite
- UI: Tailwind CSS v4 + shadcn/ui
- Lint: oxlint (TypeScript), cargo clippy + rustfmt (Rust)
- Test: vitest (Frontend), cargo test (Rust)
- Package manager: pnpm

## Development Commands

- `pnpm tauri:dev` — Tauri dev (launches app with hot reload)
- `pnpm tauri:build` — Tauri production build (DMG)
- `pnpm app:build` — Build the release `.app` bundle once (`src-tauri/target/release/bundle/macos/Launchpane.app`)
- `pnpm app:watch` — Rebuild the release `.app` on every source change (do not run alongside `pnpm tauri:dev`; they share the cargo target lock)
- `pnpm app:open` — Open the most recent release `.app` bundle
- `pnpm store:icons` — Regenerate `src-tauri/icons/` from `branding/launchpane-icon-1024.png`
- `pnpm store:screenshots` — Render Mac App Store screenshot sizes from `branding/screenshots/source/`
- `pnpm appstore:verify` — Validate App Store metadata, versions, icons, and screenshots
- `pnpm appstore:prepare` — Build the Fastlane metadata/screenshots payload
- `pnpm appstore:build` — Build, sign, and package the universal Mac App Store app (requires Apple credentials)
- `pnpm appstore:validate` — Verify the signed package locally
- `pnpm appstore:upload` — Upload the package, metadata, and screenshots over the App Store Connect API
- `pnpm dev` — Vite dev server only (frontend)
- `pnpm build` — TypeScript check + Vite build
- `pnpm lint` — oxlint
- `pnpm typecheck` — TypeScript type check
- `pnpm test` — vitest (frontend tests)
- `cargo test --manifest-path src-tauri/Cargo.toml` — Rust tests
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — Rust format check
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` — Rust lint

- `pnpm version:patch` — Bump patch version, commit, and create git tag
- `pnpm version:minor` — Bump minor version, commit, and create git tag
- `pnpm version:major` — Bump major version, commit, and create git tag

Note: `cargo tauri` is not available. Use `pnpm tauri` or `pnpm exec tauri` instead.

## Project Structure

- `src-tauri/src/` — Rust backend (launchctl wrapper, plist parsing, Tauri commands)
- `src/` — React frontend
- `src/components/ui/` — shadcn/ui components (auto-generated, do not edit manually)
- `src/lib/invoke.ts` — Typed Tauri invoke wrappers
- `src/test-utils/tauri-mock.ts` — Fake Tauri IPC for testing (not mock, but fake implementation)

## Testing

- Frontend tests use a fake Tauri IPC layer (`src/test-utils/tauri-mock.ts`) instead of mocking
- Vitest config aliases `@tauri-apps/api/core` to the fake module
- Use `setFakeHandler()` / `resetFakeHandlers()` to customize per-test behavior

## Notes

- `RUSTUP_HOME` must be explicitly set to `$HOME/.rustup` when running cargo commands in this environment
- TypeScript: use `type` not `interface`
- User agents directory: `~/Library/LaunchAgents/`
- System agents/daemons are read-only in the UI
- Login items (`<App>.app/Contents/Library/LoginItems/<Helper>.app`) are discovered in `src-tauri/src/login_items.rs`; they have no plist, so only Enable/Disable is supported
- Project language is English (README, commit messages, code comments)
