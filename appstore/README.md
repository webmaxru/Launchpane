# Mac App Store release

Launchpane's App Store pipeline builds a universal macOS app, embeds its Mac App
Store provisioning profile, signs it with Apple distribution certificates,
creates a signed installer package, then uploads the binary, metadata, and
screenshots through the App Store Connect REST API. No Xcode, Transporter, or
Fastlane installation is required.

## Apple account prerequisites

Create these items in the Apple Developer and App Store Connect portals:

1. An explicit App ID for `com.webmaxru.launchpane`.
2. A **Mac App Distribution** certificate and exported `.p12`.
3. A **Mac Installer Distribution** certificate and exported `.p12`.
4. A Mac App Store provisioning profile for the bundle ID.
5. An App Store Connect app record with bundle ID `com.webmaxru.launchpane`.
6. An App Store Connect API key with App Manager access.
7. App privacy responses set to **No, we do not collect data from this app**,
   matching [`app-privacy.json`](app-privacy.json). Apple does not expose this
   setting through API-key authentication, so it is a one-time app-record setup.
8. Temporary sandbox exception usage information copied from
   [`sandbox-exceptions.md`](sandbox-exceptions.md), including a Feedback
   Assistant ID if Apple requests one.
9. A physical-device recording and completed QA checklist prepared from
   [`review-recording.md`](review-recording.md) before each review submission.

Mac App Store review is not guaranteed: launch-service management needs
temporary sandbox exceptions that Apple evaluates case by case.

The [App Store action table and link-policy assessment](../docs/app-store-actions.md)
documents disabled edition-specific controls, their hints, and the neutral
GitHub project link. A feature build or local ad-hoc signature does not replace
exact-build sandbox QA or establish App Review approval.

## GitHub environment and secrets

Create a protected GitHub environment named `mac-app-store`. Add an approval
rule if publishing must be reviewed by a human. Configure these secrets:

| Secret | Value |
| --- | --- |
| `MACOS_APPLICATION_CERTIFICATE_BASE64` | Base64-encoded Mac App Distribution `.p12` |
| `MACOS_APPLICATION_CERTIFICATE_PASSWORD` | Password for that `.p12` |
| `MACOS_INSTALLER_CERTIFICATE_BASE64` | Base64-encoded Mac Installer Distribution `.p12` |
| `MACOS_INSTALLER_CERTIFICATE_PASSWORD` | Password for that `.p12` |
| `MACOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded `.provisionprofile` |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API key ID |
| `APP_STORE_CONNECT_API_ISSUER_ID` | App Store Connect issuer ID |
| `APP_STORE_CONNECT_API_PRIVATE_KEY_BASE64` | Base64-encoded `AuthKey_*.p8` |
| `APP_REVIEW_FIRST_NAME` | App Review contact first name |
| `APP_REVIEW_LAST_NAME` | App Review contact last name |
| `APP_REVIEW_PHONE` | App Review contact phone, including country code |
| `APP_REVIEW_EMAIL` | App Review contact email |

Encode files without line wrapping:

```bash
base64 < certificate.p12 | pbcopy
base64 < Launchpane.provisionprofile | pbcopy
base64 < AuthKey_KEYID.p8 | pbcopy
```

## Automated release

Run **Publish to Mac App Store** from GitHub Actions. By default it uploads the
build without submitting it for review. The dispatch form can also submit for
review and choose automatic release after approval.

Version tags publish only the standalone GitHub distribution. Store publishing
is manual-only: dispatch **Publish to Mac App Store** for the intended source
ref after preparing current captures, credentials, and submission QA.

The workflow:

1. regenerates and verifies screenshots and metadata;
2. builds a universal `Launchpane.app`;
3. embeds the provisioning profile and App Store entitlements;
4. signs with the Mac App Distribution certificate;
5. creates `Launchpane.pkg` with the Mac Installer Distribution certificate;
6. verifies code and installer signatures;
7. uploads the package through the App Store Connect build upload API;
8. writes metadata, screenshots, age rating, and review details over the API;
9. optionally submits the version for App Review.

The age-rating declaration is uploaded from [`age-rating.json`](age-rating.json).
The App Review recording shot list and test checklist are maintained in
[`review-recording.md`](review-recording.md). The recording itself must be
captured on a physical Mac and attached in App Store Connect; it is not
generated from the native screenshot resizing pipeline. Screenshot provenance
must match the current app sources before the workflow can regenerate assets.

## Local release

Install credentials in a temporary keychain, then export:

```bash
export MACOS_PROVISIONING_PROFILE_PATH=/secure/Launchpane.provisionprofile
export APP_STORE_CONNECT_API_KEY_ID=...
export APP_STORE_CONNECT_API_ISSUER_ID=...
export APP_STORE_CONNECT_API_KEY_PATH=/secure/AuthKey_KEYID.p8
export APP_BUILD_NUMBER=1

# Used by scripts/appstore-submit.mjs
export ASC_KEY_ID="$APP_STORE_CONNECT_API_KEY_ID"
export ASC_ISSUER_ID="$APP_STORE_CONNECT_API_ISSUER_ID"
export ASC_KEY_PATH="$APP_STORE_CONNECT_API_KEY_PATH"
export ASC_APP_ID=6820735995
export ASC_CONTACT_FIRST_NAME=...
export ASC_CONTACT_LAST_NAME=...
export ASC_CONTACT_EMAIL=...
export ASC_CONTACT_PHONE='+4700000000'
# Required when Apple asks for a physical-device demonstration:
export ASC_REVIEW_RECORDING_PATH=/secure/launchpane-review.mov
```

Set `ASC_SUBMIT=false` to prepare everything without submitting for review.

Then run:

```bash
pnpm appstore:release
```

The signed package is placed in `release/appstore/`.

### Local build and asset outputs

The current native capture set generates four screenshots at each of the four
supported sizes. `pnpm appstore:prepare` places the largest set and updated
metadata in `release/appstore/fastlane/`; it preserves existing app bundles and
installer packages.

Local builds are recorded in `release/build-status.json`, with checksums in
`release/SHA256SUMS`. Standalone app bundles and DMGs are in
`release/standalone/{universal,arm64,x86_64}/`. Store artifacts are in
`release/appstore/`: `Launchpane-unsigned.app`, `Launchpane-unsigned.pkg`, and a
separate `Launchpane-sandbox-preview.app` signed ad-hoc for local inspection.
The preview has a distinct executable name to avoid native automation targeting
another open Launchpane instance.

These are not production-signed releases. Distribution signing requires access
to the signing key; local assets do not establish App Review compliance or
replace exact submitted-build QA and the requested physical-Mac recording.
Nothing is uploaded by the screenshot, verification, or preparation commands.

## Public pages

`.github/workflows/pages.yml` publishes `docs/` to GitHub Pages. Enable GitHub
Pages with **GitHub Actions** as the source before submitting:

- Marketing: `https://webmaxru.github.io/Launchpane/`
- Privacy: `https://webmaxru.github.io/Launchpane/privacy/`
- Support: `https://webmaxru.github.io/Launchpane/support/`
