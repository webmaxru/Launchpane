# Launchpane brand & Mac App Store assets

All artwork in this folder is original work created for Launchpane. No third-party
or Apple-owned assets are included.

## Source artwork

| File | Purpose |
| --- | --- |
| `launchpane-icon.svg` | Master app icon (vector, 1024 × 1024 canvas) |
| `launchpane-icon-1024.png` | Rasterised master icon with alpha — input for icon generation |
| `launchpane-wordmark.svg` | Horizontal lockup (icon + wordmark + tagline) |

### Palette

| Token | Hex | Use |
| --- | --- | --- |
| Launch Blue (light) | `#5B8DEF` | Icon plate gradient start |
| Launch Blue (mid) | `#3A63D8` | Icon plate gradient middle |
| Launch Blue (deep) | `#2A3FB0` | Icon plate gradient end |
| Pane White | `#FFFFFF` | Pane surface |
| Pane Chrome | `#DCE6FB` | Pane title bar |
| Signal Gold | `#FFD36B` → `#FFF4D2` | Launch arrow |
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
# Rebuild every bundle icon from the master PNG (writes src-tauri/icons/)
pnpm store:icons

# Convert raw captures into every App Store Connect macOS screenshot size
pnpm store:screenshots
```

`pnpm store:icons` also emits `src-tauri/icons/ios` and `src-tauri/icons/android`;
Launchpane is a macOS-only app, so those folders are removed from the repository.

## Screenshots

1. Capture the running app (`pnpm app:open`) at a 16:10 window size.
2. Save the captures as PNG into `branding/screenshots/source/`.
3. Run `pnpm store:screenshots`.

Output is written to `branding/store/screenshots/` at every size App Store Connect
accepts for macOS: `1280x800`, `1440x900`, `2560x1600` and `2880x1800`. Captures that
are not exactly 16:10 are scaled to fit and padded with `#F5F6FA`.

## Submission checklist

- [ ] `appstore-icon-1024.png` uploaded — must stay free of an alpha channel.
- [ ] At least one screenshot per supported display size.
- [ ] Bundle identifier `com.webmaxru.launchpane` registered in App Store Connect.
- [ ] App sandbox impact reviewed — Launchpane drives `launchctl` and writes to
      `~/Library/LaunchAgents`, which sandboxed apps cannot do. A notarised direct
      download is the lower-friction distribution route.
- [ ] `LICENSE` and `NOTICE` shipped with the source distribution.
