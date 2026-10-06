# Mac App Store release

Launchpane's App Store pipeline builds a universal macOS app, embeds its Mac App
Store provisioning profile, signs it with Apple distribution certificates,
creates a signed installer package, validates the package with App Store
Connect, and uploads the binary, metadata, and screenshots with Fastlane.

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

Mac App Store review is not guaranteed: launch-service management needs
temporary sandbox exceptions that Apple evaluates case by case.

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

Pushing a version tag also uploads a build but does not submit it automatically:

```bash
pnpm version:patch
git push origin main --follow-tags
```

The workflow:

1. regenerates and verifies screenshots and metadata;
2. builds a universal `Launchpane.app`;
3. embeds the provisioning profile and App Store entitlements;
4. signs with the Mac App Distribution certificate;
5. creates `Launchpane.pkg` with the Mac Installer Distribution certificate;
6. verifies code and installer signatures;
7. validates the package with Apple's `altool`;
8. uploads the package, metadata, and screenshots through Fastlane;
9. optionally submits the version for App Review.

The age-rating declaration is uploaded from [`age-rating.json`](age-rating.json).

## Local release

Install Ruby dependencies with `bundle install`, put credentials in a temporary
keychain, and export:

```bash
export MACOS_PROVISIONING_PROFILE_PATH=/secure/Launchpane.provisionprofile
export APP_STORE_CONNECT_API_KEY_ID=...
export APP_STORE_CONNECT_API_ISSUER_ID=...
export APP_STORE_CONNECT_API_KEY_PATH=/secure/AuthKey_KEYID.p8
export APP_BUILD_NUMBER=1
```

Then run:

```bash
pnpm appstore:release
```

The signed package and generated Fastlane payload are placed in
`release/appstore/`.

## Public pages

`.github/workflows/pages.yml` publishes `docs/` to GitHub Pages. Enable GitHub
Pages with **GitHub Actions** as the source before submitting:

- Marketing: `https://webmaxru.github.io/Launchpane/`
- Privacy: `https://webmaxru.github.io/Launchpane/privacy/`
- Support: `https://webmaxru.github.io/Launchpane/support/`
