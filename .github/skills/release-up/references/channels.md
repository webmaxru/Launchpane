# Channel runbook

## Source of truth

Inspect these on every release; this skill does not replace their implementation:

| Surface | Files |
| --- | --- |
| Version and bump | `package.json`, `scripts/bump-version.ts`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` |
| GitHub pipeline | `.github/workflows/release.yml`, `scripts/package-standalone-release.ts` |
| Store pipeline | `.github/workflows/appstore-release.yml`, `scripts/macos-app-store.sh`, `scripts/appstore-submit.mjs` |
| Store assets | `scripts/store-screenshot-source.ts`, `scripts/make-store-screenshots.ts`, `scripts/verify-appstore.ts`, `scripts/appstore-release.ts`, `branding/screenshots/source/captures.json` |
| Policy and review | `appstore/README.md`, `appstore/review-recording.md`, `appstore/sandbox-exceptions.md`, `docs/app-store-actions.md`, `appstore/metadata/en-US/` |

Use `gh` for current release/run/secret-name state. Use authenticated Apple APIs
with existing authorized credentials for current versions/builds; never treat
historical review notes as live status. Review API pagination and build/version
relationships before selecting a record.

## Standalone GitHub channel

Required `macos-distribution` environment secrets:

- `DEVELOPER_ID_CERTIFICATE_BASE64`: Developer ID Application certificate AND
  private key in a password-protected PKCS#12 export.
- `DEVELOPER_ID_CERTIFICATE_PASSWORD`: its export password.
- `APPLE_SIGNING_IDENTITY`: exact Developer ID Application identity.
- `APPLE_API_KEY`, `APPLE_API_ISSUER`, `APPLE_API_PRIVATE_KEY_BASE64`: authorized
  notarization API credentials.

Do not substitute Store distribution certificates, development signing, or
ad-hoc signing. No Developer ID Installer certificate is needed for app/DMG
downloads. Certificate/private-key match, validity, Hardened Runtime, and Apple
timestamp must be correct. Import only into a temporary signing keychain; clean
up keychain, private key files, and export files on failures too.

The release workflow checks out the tag, verifies all four versions, tests both
editions, builds `aarch64-apple-darwin`, `x86_64-apple-darwin` and
`universal-apple-darwin`, and signs/notarizes using Tauri. Inspect Tauri behavior
for the installed version: do not assume both app and DMG have valid stapled
tickets merely because notarization of one succeeded. Fix missing signing or
stapling and validate it before continuing, not by weakening the gate.

Packaging must check app identity, strict signature, architecture, version,
license, DMG integrity, app/DMG staples, and Gatekeeper. Extract the final archive
and verify its app again: `.tar.gz` cannot be stapled itself, and losing the
contained app's ticket breaks offline validation. Calculate hashes after every
signing/stapling/packaging mutation, not before.

For a new release, after the desired source is landed and verified:

```bash
git tag -a vX.Y.Z <verified-release-sha> -m "Launchpane vX.Y.Z"
git push origin vX.Y.Z
```

Replace placeholders with verified values. Tag creation is publication-triggering,
not a harmless local bookkeeping step once pushed. Check there is no conflicting
remote tag/run/release first. Observe `Standalone release`; all three builds must
pass before publish. A manual retry uses an existing immutable tag containing
the correct workflow/code, not an old tag that checks out obsolete scripts.

Expected public payload: three versioned DMGs, three stable architecture-named
app archives, and `SHA256SUMS` (seven assets). Verify release is public,
non-prerelease when intended, and latest; download assets and check hashes,
archive architectures/version/license, and signed/notarized status. Confirm
normal quarantined launch on supported macOS when feasible. Do not direct users
to disable Gatekeeper or remove quarantine for a purported signed release.

A failed upload can leave a draft. Inspect exact ownership/source/payload before
retrying; never delete or clobber a public release without explicit approval.
The current workflow creates rather than overwrites releases. Check concurrency
and notary submission status before duplicating work.

## Store channel: credentials and build identity

`mac-app-store` is separate from `macos-distribution`. Required names are listed
in `appstore/README.md` and the workflow:

- `MACOS_APPLICATION_CERTIFICATE_BASE64`, its
  `MACOS_APPLICATION_CERTIFICATE_PASSWORD`.
- `MACOS_INSTALLER_CERTIFICATE_BASE64`, its
  `MACOS_INSTALLER_CERTIFICATE_PASSWORD`.
- `MACOS_PROVISIONING_PROFILE_BASE64`.
- `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`,
  `APP_STORE_CONNECT_API_PRIVATE_KEY_BASE64`.
- `APP_REVIEW_FIRST_NAME`, `APP_REVIEW_LAST_NAME`, `APP_REVIEW_PHONE`,
  `APP_REVIEW_EMAIL`.

Check installed/CI signing identity matches the profile's certificates, team,
bundle identifier, entitlements, distribution type and validity. A standalone
notarization key may authenticate Store APIs but its permissions must be tested;
sharing credentials is not automatic sharing of environment secret names.
Certificate issuance can require the Apple Account Holder. Do not repeatedly
retry a permissions failure or silently issue/revoke certificates.

Use the same marketing version/source as GitHub but a distinct, monotonically
valid Apple `CFBundleVersion`. Query Apple and account for older local/CI build
numbers; workflow `github.run_number` may be lower than timestamp-numbered
previous uploads, and reruns reuse it. Do not dispatch until the selected build
number reaches the bundle, upload request, manifest and QA notes consistently.
Never reuse an uploaded build number for changed bytes. Store build numbers
are not Git tags or semver bumps.

Store universal build uses `--features app-store` and
`src-tauri/tauri.app-store.conf.json`, embeds the provisioning profile, signs the
app and `.pkg` using Store certificates and verifies App Sandbox entitlements.
Do not notarize the Store package using Developer ID or use its expected
Gatekeeper rejection as evidence the package is unsigned. Check package/app
signatures and Apple package validation instead.

Local cross-builds need `RUSTUP_HOME="$HOME/.rustup"` and
`PATH="$HOME/.cargo/bin:$PATH"`. Both channels reuse the universal cargo/bundle
path. Never let one build overwrite the other artifact before copying and
recording its feature, version, source, signing status and hashes.

## Store assets, QA, and submission

Run `pnpm store:screenshots`, `pnpm appstore:verify`, and
`APP_BUILD_NUMBER=<candidate-build> pnpm appstore:prepare` only when native source
captures genuinely match the candidate's version/source fingerprint. All four
screenshots at all four accepted sizes must be opaque, correctly sized, current,
and privacy-safe. Missing/stale provenance is a blocker, not an invitation to
rewrite hashes. Regenerate icons if icon source changed; do not redesign branding
for a release.

The existing source digest includes version manifests and Tauri config. Even a
version-only bump invalidates captures under the current policy. Recapture the
candidate; changing that policy requires a separately justified, tested change.
Metadata/scripts edits alone do not prove visuals need changing. Store screenshots
must show the Store edition, not standalone administrator features.

Read current Apple feedback and `appstore/review-recording.md`. Verify the exact
production-signed build through TestFlight/appropriate Apple installation on a
physical Mac. A locally ad-hoc/re-signed sandbox preview is useful smoke evidence
but is not exact submitted-build QA. If Apple requires latest-macOS recording,
verify actual device/OS, successful native launch, all requested user flows and
full recording playback; record build/video hashes and remove disposable agents.
Do not upgrade/restart the user's Mac or fabricate this evidence autonomously.

Default release scope can build/validate/upload a candidate before this final
submission QA finishes, if accurately described. App Review submission and
recording upload remain blocked until their gates and authorizations pass.

## Store integration hazards to check before executing

At skill authoring, the workflow and uploader have mismatches. Recheck current
code; if still present, fix and validate before invoking upload, or report that
stage blocked. Do not describe configured secrets or workflow syntax as proof
of end-to-end Store release readiness.

1. Workflow exports `APP_STORE_CONNECT_API_*` and `APP_REVIEW_*`, but
   `appstore-submit.mjs` requires `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`,
   `ASC_APP_ID` and `ASC_CONTACT_*`. Explicitly map them and verify the app
   record/bundle rather than relying on an undocumented hard-coded app ID.
2. Workflow uses `SUBMIT_FOR_REVIEW`; uploader defaults `ASC_SUBMIT` to true.
   Set `ASC_SUBMIT=false` explicitly for upload/prepare-only. Confirm no wrapper
   overrides it. The `automatic_release` workflow input is not consumed by the
   uploader, which sets `releaseType: AFTER_APPROVAL`. Implement and verify
   `MANUAL` when requested; never promise manual release from an unused flag.
3. Uploader chooses an editable version and can rename it. Select the intended
   version, preserve another pending release, create a version if necessary,
   and respect Apple editability/processing rules. Never retarget whatever record
   happened to be first.
4. Build lookup/reuse must match app, platform, marketing version and build number;
   an existing uploaded number alone does not establish byte/source identity or
   `VALID` processing. Wait for the exact build, inspect failures and export
   compliance before attaching or submitting.
5. Uploader replaces screenshots and changes metadata even with `ASC_SUBMIT=false`.
   This flag is not a read-only dry run. Confirm intended version ownership and
   upload authorization before invoking it.

Separate stages are prepare, build/sign/package, Apple validation, upload,
processing, attach to version/TestFlight, native QA, metadata/review readiness,
review submission, approval, and public release. Dispatch the Store workflow
against the release tag only after its inputs/environment mappings are verified.
If build-only is requested, the existing publish workflow is not suitable unless
adapted to stop before upload. Do not invoke `pnpm appstore:release` for build-only.

## Recovery and credential custody

Keep existing GitHub/Store releases usable when another channel fails. Report
exact stages, source/version skew and safe retry path. Do not rename an approved
Store version to match a newer GitHub version; catch up with a new compatible
Store version or an explicit exception. A Store rejection may need only metadata
fixes, or a new build; distinguish them before bumping marketing version.

Routine GitHub release dispatch needs no local certificate folder: runners use
environment secrets. Keep encrypted backups of the PKCS#12/password and Apple
API key separately for recovery; GitHub secrets cannot be downloaded and a
public `.cer` cannot recreate a private key. Never delete the user's credential
backups during temporary runner cleanup. Renew/rotate credentials when expired
or revoked, not on every release.

## Decision checks before claiming completion

| Request or event | Required behavior |
| --- | --- |
| "Release up" without a bump | Recommend/ask bump; coordinate both channels; no implicit App Review submission |
| "Minor release" | One compatible minor marketing version for both channels |
| "Breaking release" | Major/migration decision and compatibility evidence |
| "Same version" with public GitHub assets | Preserve tag/assets; retry unchanged failed stages or request a new version |
| "Store only, same version" | Verify editable version, matching source policy, fresh Apple build number |
| Missing Store secrets or stale screenshots | Finish authorized standalone work; Store stage remains explicitly blocked |
| Simultaneous availability requested | Keep GitHub draft and Store manual release; wait for approval gates |
| Upload succeeds but build still processing | Report uploaded/processing, not ready/submitted/public |
| "Prepare only" | No pushed publication-triggering tag, upload, submission or public release |
| First signed GitHub release | Real full signing/notarization run required; secret-name checks alone are insufficient |
