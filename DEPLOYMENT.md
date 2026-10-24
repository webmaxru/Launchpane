# Releasing and deploying Launchpane

Maintainer guide for signed standalone releases, Mac App Store publishing, and
the product website. For local builds and tests, see
[DEVELOPMENT.md](DEVELOPMENT.md).

## Release coordination

The repository includes the Copilot agent skill
[`release-up`](.github/skills/release-up/SKILL.md). Prompt **"release up"** to
coordinate standalone and Store release preparation. It resolves patch/minor/
major or same-version retries, pins both channels to one source/version, and
checks credentials, native assets, signing and review gates. Store upload,
App Review submission and public availability are separate stages; a generic
release request does not authorize review submission or guarantee simultaneous
availability. Creating the skill does not itself trigger a release.

Version bumps: `pnpm version:patch`, `pnpm version:minor`, or
`pnpm version:major` update the synchronized versions, commit, and tag.

## Standalone release (GitHub)

Pushing a `v<version>` tag runs **Standalone release**. The tag must match
`package.json`, both Rust version records, and `src-tauri/tauri.conf.json`.
The pipeline checks the frontend and both backend editions, then builds
Apple Silicon, Intel, and Universal standalone apps and DMGs. It verifies
bundle versions, CPU architectures, license inclusion, and DMG integrity,
imports a Developer ID certificate into a temporary keychain, signs with
Hardened Runtime, notarizes and staples the apps and DMGs, verifies
Gatekeeper acceptance, packages the `.app` archives, and generates SHA-256
checksums. It fails rather than silently publishing unsigned or unstapled
artifacts.

Only after all builds succeed does it upload all seven assets to a draft
GitHub release and publish it as latest. A failed build publishes nothing;
a failed upload leaves a draft, never a partial public release.

### Configure macOS distribution credentials

Before running a signed release, create a **Developer ID Application**
certificate in the Apple Developer account, export its certificate and private
key as a password-protected `.p12`, and create an App Store Connect API key
with access to submit software for notarization. The separate **Developer ID
Installer** certificate is not needed for the app archives and DMGs.

In GitHub **Settings → Environments**, configure the `macos-distribution`
environment with these secrets:

| Secret | Value |
| --- | --- |
| `DEVELOPER_ID_CERTIFICATE_BASE64` | Base64-encoded Developer ID Application `.p12`, including its private key |
| `DEVELOPER_ID_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | Full `Developer ID Application: … (TEAMID)` identity shown by `security find-identity -v -p codesigning` |
| `APPLE_API_KEY` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect issuer ID |
| `APPLE_API_PRIVATE_KEY_BASE64` | Base64-encoded API `.p8` private key |

Protect these secrets; never commit them or paste them into source files.
Each macOS build runner imports the certificate into a temporary keychain,
writes the API key to a temporary file, and removes both after the build.
The workflow checks the imported identity, signed app, notarization tickets,
stapling, and Gatekeeper assessments before it uploads anything. A missing
secret or failed Apple notarization stops the release before publication.

The older **v1.2.1** release predates the signing credentials and remains
unsigned and unnotarized; it is not silently replaced. Releases from **v1.2.2**
onward are signed and notarized.

To publish a subsequent version, configure the distribution secrets above,
bump the synchronized versions, commit all intended app changes, push the
commit, and push its matching version tag.
The workflow also supports manual dispatch with an existing tag. If a failed
publication left a draft, inspect and delete that draft before retrying;
the workflow does not overwrite existing releases.

## Mac App Store

**Publish to Mac App Store** is manual-only and is not triggered by standalone
tags. It builds a universal binary, embeds the provisioning profile, signs the
app and installer, validates them with Apple, uploads all metadata and
screenshots, and can submit the version for review. Its signing, upload, and
review requirements and credentials are separate from the standalone release.

```bash
pnpm appstore:verify    # validate copy, versions, icons, and screenshots
pnpm appstore:prepare   # assemble Fastlane metadata and graphics
pnpm appstore:build     # build, sign, and package (requires Apple credentials)
pnpm appstore:validate  # verify the signed package locally
pnpm appstore:upload    # upload package, metadata, and screenshots
```

The complete credential-driven flow, entitlement policy, and review checklist
are in [`appstore/README.md`](appstore/README.md).

## Product website

Both this repository's GitHub Pages site and the canonical portfolio route are
built from `docs/` (see [DEVELOPMENT.md](DEVELOPMENT.md#product-website) for
local builds).

**Publish product pages** builds website changes on pull requests without
deploying them. Changes merged into `main` build and deploy the repository's
[Pages site](https://salnikov.no/Launchpane/) automatically;
the workflow can also be run manually. GitHub Pages must be enabled with
**GitHub Actions** as its source in repository settings. The workflow uses
the `github-pages` environment and deploys only after the build succeeds.

The canonical [`/projects/launchpane/`](https://salnikov.no/projects/launchpane/)
route is published separately by
[Deploy portfolio to GitHub Pages](https://github.com/webmaxru/webmaxru.github.io/actions/workflows/pages.yml).
That workflow checks out Launchpane's default branch, builds this site, and copies
it into the portfolio's `dist/projects/launchpane/`. After merging website changes
here, rerun the portfolio workflow on `master` to update the canonical URL too.
The portfolio workflow runs on its own pushes or manual dispatch, not automatically
on Launchpane commits.
