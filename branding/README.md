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
| `01-launch-pane` | Graphite squircle of agent tiles, one lifting clear and glowing mint **(in use)** |
| `02-ignition-switch` | Free-form vertical toggle in the ON position with a power-symbol knob |
| `03-cutout-pane` | Indigo squircle with a launch arrow knocked out of a white pane |
| `04-daemon-pulse` | Free-form pane frame with a heartbeat running straight through it |
| `05-pane-stack` | Free-form 3D stack of tilted panes, front pane active |

### Palette

| Token | Hex | Use |
| --- | --- | --- |
| Graphite (light) | `#2B3566` | Icon plate gradient start |
| Graphite (mid) | `#1B2040` | Icon plate gradient middle |
| Graphite (deep) | `#0E1226` | Icon plate gradient end |
| Pane Glass | `#FFFFFF` @ 7–22 % | Inactive agent tiles |
| Signal Mint (light) | `#7DF9D0` | Active tile highlight |
| Signal Mint (mid) | `#35D6A4` | Active tile body |
| Signal Mint (deep) | `#17A98A` | Active tile shade |
| Launch Ink | `#0E2E27` | Arrow glyph on the active tile |
| Ink | `#1B2559` | Wordmark |
| Ink Muted | `#6B7699` | Tagline |

## Generated deliverables (`store/`)

| File | Purpose |
| --- | --- |
| `appstore-icon-1024.png` | App Store marketing icon — 1024 × 1024, **no alpha channel** |
| `icon-{16,32,64,128,256,512,1024}.png` | Reference PNG sizes |
| `Launchpane.icns` | macOS bundle icon (mirrors `src-tauri/icons/icon.icns`) |
| `launchpane-wordmark-1600x400.png` | Marketing lockup for listings, README and web |
| `screenshots/<size>/` | Submission-ready screenshots (generated, see below) |

## Regenerating

```bash
# Rebuild every icon artefact from the selected concept (writes src-tauri/icons/
# and branding/store/)
pnpm icons

# Render the marketing screenshot sources at every accepted macOS size
pnpm store:screenshots
```

`pnpm icons` also emits `src-tauri/icons/ios` and `src-tauri/icons/android`;
Launchpane is a macOS-only app, so those folders are removed from the repository.

## Screenshots

The editable SVG compositions in `branding/screenshots/source/` accurately
represent the Launchpane interface with non-personal sample data. Update those
sources when the UI changes, then run `pnpm store:screenshots`.

Output is written to `branding/store/screenshots/` at every size App Store Connect
accepts for macOS: `1280x800`, `1440x900`, `2560x1600` and `2880x1800`.
Generated PNGs are opaque and contain no alpha channel.

## Submission checklist

- [ ] `appstore-icon-1024.png` uploaded — must stay free of an alpha channel.
- [ ] At least one screenshot per supported display size.
- [ ] Bundle identifier `com.webmaxru.launchpane` registered in App Store Connect.
- [ ] App sandbox impact reviewed — Launchpane drives `launchctl` and writes to
      `~/Library/LaunchAgents`, which sandboxed apps cannot do. A notarised direct
      download is the lower-friction distribution route.
- [ ] `LICENSE` and `NOTICE` shipped with the source distribution.
