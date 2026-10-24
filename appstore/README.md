# Mac App Store release

The 1.4.0 Store candidate is a service inspector and personal plist editor.
It removes all lifecycle, enable/disable, removal and administrator operations;
the standalone edition retains them. The [edition comparison](../docs/app-store-actions.md)
is authoritative. A sandboxed filesystem grant is not launchd-control permission.

Screenshot derivatives are rendered into explicit opaque RGB bitmaps by the
CoreGraphics helper, not round-tripped through BMP: recent ImageIO versions preserve
alpha in that conversion. The release test checks the PNG color type as well
as macOS's alpha inspection.

Launchpane's App Store pipeline builds a universal macOS app, embeds its Mac App
Store provisioning profile, signs it with Apple distribution certificates,
creates a signed installer package, then uploads the binary, metadata, and
screenshots through the App Store Connect REST API. GitHub's macOS runner uses
`altool` for package validation before REST upload; no Fastlane setup is used.

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
8. Verify user-selected folder access as described in
   [`sandbox-exceptions.md`](sandbox-exceptions.md). No temporary filesystem
   exceptions or `com.apple.security.get-task-allow` key may be signed into the app.
9. A physical-device recording and completed QA checklist prepared from
   [`review-recording.md`](review-recording.md) before each review submission.

Mac App Store review is not guaranteed. The Store edition must obtain folder
access using the native macOS picker; saved paths do not grant access. The
current implementation restores user-granted security-scoped bookmarks after
restart; Forget folders removes saved access. File access does
not grant permission to control launchd. This edition deliberately has no
service-control operations; verify inspection and selected-file editing in the
submitted binary instead.

The [App Store action table and link-policy assessment](../docs/app-store-actions.md)
documents removed edition-specific controls, their explanations, and the
GitHub source-code/standalone-download link. A feature build or local ad-hoc signature does not replace
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

Also configure environment variable `ASC_APP_ID` with the verified Apple app
record ID. Restrict deployment branches to a **tag** policy named `v*`.
The standalone `macos-distribution` environment uses the same tag policy, but
different Developer ID certificates and secret names.

### Verified environment provisioning

`pnpm store:environment --check` validates existing credential backups and Apple
API access without changing GitHub. `pnpm store:environment --apply` then creates
or updates the environment, preserves existing reviewer rules, uploads the
12 secrets without printing values, sets the tag policy, and records `ASC_APP_ID`
from the matching bundle. Existing App Review contact details are read from Apple,
not invented or hard-coded.

The commands require `STORE_CREDENTIAL_DIRECTORY` (containing `app.p12`,
`installer.p12`, matching `.cert.pem` and `.key.pem` files, and
`Launchpane.provisionprofile`), `STORE_CERTIFICATE_PASSWORD_FILE` (a protected
password file for both exports), `APP_STORE_CONNECT_API_KEY_ID`,
`APP_STORE_CONNECT_API_ISSUER_ID`, and `APP_STORE_CONNECT_API_KEY_PATH`.
They do not issue certificates or recover secret values from GitHub.

Run `node scripts/check-release-environments.mjs` to check both channel
environments. After bumping the version and recapturing the Store UI, run
`pnpm release:preflight` to also verify screenshot provenance before tagging.
Secret-name presence alone is not evidence of signing or upload readiness.

## Automated release

Run **Publish to Mac App Store** from GitHub Actions **on the immutable release
tag**. Supply the same `release_tag` and an explicit, unused `build_number`
greater than existing Apple builds/uploads. Reruns must not reuse an uploaded
number. `upload=true` uploads a validated build and prepares manual release;
`upload=false` builds/signs/validates and archives artifacts only.

The workflow always sets `ASC_SUBMIT=false` and
`ASC_AUTOMATIC_RELEASE=false`. It cannot submit for review or select automatic
publication. Those are separate, explicitly authorized stages after exact-build
native QA.

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
9. stops before App Review with manual release configured.

Entitlement validation runs before compilation, before signing, and on every
signed Mach-O executable in the final app. It rejects temporary filesystem
exceptions, any debug entitlement (including `get-task-allow=false`), missing
sandbox/WebKit/user-selected access, and mismatched app/team identifiers.

The uploader never renames an unrelated editable version. It rejects mismatched
app IDs, non-editable target versions, reused build numbers, invalid processing,
and package/source receipt mismatches. Upload processing succeeds before live
metadata changes, and replacement screenshots complete processing before the
previous screenshots are deleted.

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
export ASC_APP_ID=... # Verified Apple app record ID, not the bundle identifier
export ASC_CONTACT_FIRST_NAME=...
export ASC_CONTACT_LAST_NAME=...
export ASC_CONTACT_EMAIL=...
export ASC_CONTACT_PHONE='+4700000000'
# Required when Apple asks for a physical-device demonstration:
export ASC_REVIEW_RECORDING_PATH=/secure/launchpane-review.mov
```

Both `ASC_SUBMIT` and `ASC_AUTOMATIC_RELEASE` default to false. Explicitly set
them to `true` only for user-authorized stages with the required evidence.
`node scripts/appstore-submit.mjs --status` is read-only.
`node scripts/appstore-submit.mjs --preflight` additionally checks the explicit
`APP_BUILD_NUMBER` for freshness before building or uploading.

Then run:

```bash
pnpm appstore:release
```

The signed package is placed in `release/appstore/`.
CI archives the signed `.app` and `.pkg`, `build.json` (source commit, version,
build number, package hash), and `SHA256SUMS`. Package receipt validation protects
source alignment but is not a substitute for TestFlight QA.

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

- Marketing: `https://salnikov.no/projects/launchpane/`
- Privacy: `https://salnikov.no/projects/launchpane/privacy/`
- Support: `https://salnikov.no/projects/launchpane/support/`
