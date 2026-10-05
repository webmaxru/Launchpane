# App Store release package

This directory contains the data needed to prepare Launchpane for Mac App Store review.

## Included

- `metadata/en-US/description.txt` — full App Store description
- `metadata/en-US/subtitle.txt` — short subtitle
- `metadata/en-US/promotional-text.txt` — marketing blurb
- `metadata/en-US/keywords.txt` — search keywords
- `metadata/en-US/release-notes.txt` — release notes for the current version

## Release flow

1. Generate or refresh the app icon and screenshot assets:
   - `pnpm store:icons`
   - `pnpm store:screenshots`
2. Build the macOS app bundle:
   - `pnpm app:build`
3. Prepare the App Store package:
   - `pnpm appstore:prepare`
4. Upload the resulting package and metadata to App Store Connect.

For a GitHub-hosted workflow, use the generated files from `release/appstore/` as the export bundle for review and manual upload.
