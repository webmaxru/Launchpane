# Launchpane brand & Mac App Store assets

All artwork in this folder is original work created for Launchpane. No third-party
or Apple-owned assets are included.

## Source artwork

| File | Purpose |
| --- | --- |
| `concepts/*.svg` | The five icon directions (vector, 1024 × 1024 canvas) |
| `concepts/concepts.json` | Titles and rationale shown in the preview sheet |
| `concepts/preview.html` | Side-by-side comparison at 160/128/64/32 px, light and dark |
| `icon-concept.json` | Records which concept is currently shipping |
| `launchpane-icon.svg` | Master app icon — a copy of the selected concept |
| `launchpane-icon-1024.png` | Rasterised master icon **with alpha** — input for icon generation |
| `launchpane-wordmark.svg` | Horizontal lockup (icon + wordmark + tagline), rebuilt from the selection |
| `../src/assets/app-icon.svg` | Generated — the in-app header mark, kept in sync with the selected concept |
| `screenshots/source/*.png` | Current native Store-edition window captures, using disposable real agents and privacy-redacted log paths |
| `screenshots/source/captures.json` | Capture provenance, app-source fingerprint, build number, image hashes and privacy disclosures |
| `screenshots/source/*.svg` | Historical mockup artwork; excluded from Store screenshot generation |

Every icon concept has a fully transparent background. Nothing in the pipeline
flattens the app icon onto a solid colour; the single exception is the App Store
marketing icon, which Apple requires to be opaque.

### Choosing an icon

```bash
pnpm icons:preview            # render all concepts + open-able preview sheet
open branding/concepts/preview.html
pnpm icons 02-ignition-switch # promote a concept and rebuild every artefact
```

`pnpm icons` with no argument reuses the concept recorded in `icon-concept.json`.

| Concept | Idea |
| --- | --- |
| `01-launch-pane` | Graphite squircle of agent tiles, one lifting clear and glowing mint |
| `02-ignition-switch` | Free-form vertical toggle in the ON position with a power-symbol knob |
| `03-cutout-pane` | Indigo squircle with a launch arrow knocked out of a white pane |
| `04-daemon-pulse` | Free-form pane frame with a heartbeat running straight through it **(in use)** |
| `05-pane-stack` | Free-form 3D stack of tilted panes, front pane active |

### Palette

The palette below tracks the shipping mark (`04-daemon-pulse`).

| Token | Hex | Use |
| --- | --- | --- |
| Indigo (light) | `#6E8BFF` | Pane frame gradient start |
| Indigo (mid) | `#3D5BE0` | Pane frame gradient middle |
| Indigo (deep) | `#242A9E` | Pane frame gradient end |
| Signal Mint (light) | `#7DF9D0` | Pulse highlight |
| Signal Mint (mid) | `#2BD39C` | Pulse body |
| Signal Amber | `#FFD36B` | Pulse trailing edge |
| Pane Glass | `#FFFFFF` @ 7–22 % | Inactive agent dots |
| Ink | `#1B2559` | Wordmark |
| Ink Muted | `#6B7699` | Tagline |

## Generated deliverables (`store/`)

| File | Purpose |
| --- | --- |
| `appstore-icon-1024.png` | App Store marketing icon — 1024 × 1024, **no alpha channel** |
| `icon-{16,32,64,128,256,512,1024}.png` | Reference PNG sizes |
| `Launchpane.icns` | macOS bundle icon (mirrors `src-tauri/icons/icon.icns`) |
| `launchpane-wordmark-1600x400.png` | Marketing lockup for listings, README and web |
| `screenshots/<size>/` | Dimension-checked native screenshots (not a substitute for submission QA) |

## Regenerating

```bash
# Rebuild every icon artefact from the selected concept (writes src-tauri/icons/
# and branding/store/)
pnpm icons

# Resize verified native capture sources at every accepted macOS size
pnpm store:screenshots
```

`pnpm icons` also emits `src-tauri/icons/ios` and `src-tauri/icons/android`;
Launchpane is a macOS-only app, so those folders are removed from the repository.

### Website and social assets

`branding/social/og.html` is the 1200×630 social card template. Run
`pnpm site:assets` (macOS, with Chrome or Edge) to render it to
`docs/assets/og-image.png` and regenerate the favicon, Apple touch icon, and
PWA icons in `docs/` from the master artwork. Commit the generated files.

## Screenshots

Store screenshots now come from actual native windows of the `app-store`
feature build, run locally with the Store sandbox entitlements. The old SVG
reconstructions are historical artwork and are never used by the generation
script. Capture the current native edition again when app sources change.

The capture manifest ties each PNG to its app-source fingerprint and documents
its local build number, environment and explicit privacy masks. The sample user
agents are real disposable launchd services, not fake IPC or a browser replica.
The log image contains actual service output; personal path labels are covered
by solid privacy masks. The editor image is an unsaved native edit form.

`pnpm store:screenshots` fails if provenance is missing, source/image hashes
change, or captures belong to another app version. `pnpm appstore:verify` checks
all four sizes, not only the largest. Locally ad-hoc signed captures are not
exact submitted-build QA or Apple's requested latest-macOS recording.

Output is written to `branding/store/screenshots/` at every size App Store Connect
accepts for macOS: `1280x800`, `1440x900`, `2560x1600` and `2880x1800`.
Generated PNGs are opaque and contain no alpha channel.

## Submission checklist

- [ ] `appstore-icon-1024.png` uploaded — must stay free of an alpha channel.
- [ ] At least one screenshot per supported display size.
- [ ] Bundle identifier `com.webmaxru.launchpane` registered in App Store Connect.
- [ ] App sandbox impact and requested temporary file exceptions reviewed.
      The Store edition resolves the account home rather than container HOME;
      shared services stay read-only and root escalation is unavailable.
      Apple must assess the exceptions and exact submitted build.
- [ ] `LICENSE` shipped with the source distribution and inside the `.app` bundle.
