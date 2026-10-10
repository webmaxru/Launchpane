---
name: release-up
description: "Release Launchpane end to end. Use for release up, ship it, publish a release, prepare a release, bump patch/minor/major, a breaking release, same-version rebuild or retry, signed GitHub downloads, TestFlight, and Mac App Store submission. Coordinates one version and source commit across standalone and Store builds while keeping signing, upload, review submission, and public availability separate."
---

# Launchpane release coordinator

Read [the channel runbook](references/channels.md) before executing either
channel. This is a repository-specific skill, not a general deployment skill.
Use current repository files and live GitHub/Apple state as authority; examples,
old session reports, and this skill's known-blocker notes are not proof of
readiness. Do not publish anything merely because this skill was requested,
created, inspected, or explained.

## Release contract

Use one marketing version and one immutable source commit for both channels.
The binaries intentionally differ: standalone has Developer ID signing,
notarization, and administrator functionality; Store has distribution signing,
a provisioning profile, App Sandbox, and restricted actions.

Default `release up` means:

- Prepare both channels from the same release source.
- Publish signed/notarized GitHub downloads after their gates pass.
- Build and validate the Store submission package; upload it and prepare its
  App Store Connect version when that path is verified and authorized.
- Stop before sending to App Review or choosing automatic public release unless
  the user's request explicitly authorizes those stages.

State these defaults before taking release side effects. Honor narrower requests
such as "GitHub only", "Store only", "build only", or "prepare, don't publish".
Building a submission is not submitting it. Uploading is not acceptance.
Notarization is not App Review. Do not claim synchronized public availability:
Apple processing/review may take longer or reject a build.

If the user requests simultaneous availability, prepare a GitHub draft and use
manual Store release; obtain approval before making either public after Apple
approval. The current GitHub workflow publishes immediately and the Store
uploader has an automatic-release setting: adapt and validate those paths before
using them for coordinated public release. Never promise atomic cross-platform
publication.

## Resolve the version before modifying files

Read local versions, remote tags/releases, and the Store version/build state.
Inspect changes since the last released source, not just the last local commit.
If the request does not specify a bump, use `ask_user` once with a recommendation
and concrete resulting versions:

| Choice | Meaning |
| --- | --- |
| Patch | Compatible fixes, signing/distribution fixes, small corrections |
| Minor | New compatible user-visible features |
| Major / breaking | Incompatible behavior, migration, removed support or functionality |
| Same marketing version | Unpublished candidate, failed-run retry, or Store build replacement only |

"Breaking" means major, not an independent fourth increment. For a pre-1.0
version, explain the proposed compatibility convention instead of assuming it.
If questions cannot be answered, use patch for fixes and minor for compatible
features; do not infer authorization for known breaking changes or destructive
replacement. Record the assumption and stop if its risk is material.

Same version does NOT authorize overwriting a public release, moving a tag,
force-pushing, or reusing an Apple build number. A failed workflow may be rerun
on its unchanged source. A Store candidate can keep its marketing version while
using a new build number only if Apple permits editing that version. An existing
published GitHub release remains intact. Changed public binaries normally need
a new marketing version; catch-up Store uploads must match the existing GitHub
source or explicitly disclose an approved channel exception.

## Preflight

1. Check working tree, branch/worktree restrictions, remote/default branch,
   current linked PR state, remote tags, latest releases and active runs.
   Preserve unrelated edits. Do not read/write another checkout or silently
   include unreviewed changes. Do not rely on a previously merged PR as approval
   for new changes.
2. Identify desired version, source commit, channels, and authorized stages.
   Track channel stages separately in session todos. Do not make planning
   Markdown files in the repository.
3. Read `package.json`, `scripts/bump-version.ts`, both release workflows,
   packaging/upload scripts, `appstore/README.md`, `appstore/review-recording.md`,
   `docs/app-store-actions.md`, and screenshot provenance code as needed.
4. Verify environment secret NAMES and access, certificate/profile validity,
   identity/team/bundle match, Apple account permissions, and API authentication.
   Never print secret values, decode them into logs, paste keys in chat, commit
   them, or export GitHub secrets (they cannot be read back).
5. Review release notes, channel-specific metadata, privacy declarations, Store
   restrictions and Apple agreements. Do not fabricate claims, contact details,
   review evidence, certificate ownership, or approval.
6. Check free disk space, tools, dependencies, signing access, native QA and
   current Apple recording requirements. No OS upgrade/restart, credential
   issuance/revocation, service mutation, or new paid action without appropriate
   user authorization.

## Prepare and freeze

Use the existing version bump implementation. Prefer
`node scripts/bump-version.ts patch|minor|major` followed by an explicitly
reviewed commit and later tag, rather than `pnpm version:*`, which immediately
commits and tags before release gates. Ensure these four records agree:
`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the
`launchpane` entry in `src-tauri/Cargo.lock`.

Update release notes and directly related docs. For Store, use real current
native captures and honest provenance. A version/config/code change invalidates
the current capture fingerprint. Never merely edit its digest to bypass
recapture, reuse historical SVG mockups, or claim a locally re-signed preview
is the submitted binary. Follow the runbook's capture and review gates.

Run the smallest applicable gates; the standard release gate is:

```bash
pnpm lint && pnpm test && pnpm build
RUSTUP_HOME="$HOME/.rustup" PATH="$HOME/.cargo/bin:$PATH" cargo fmt --manifest-path src-tauri/Cargo.toml --check
RUSTUP_HOME="$HOME/.rustup" PATH="$HOME/.cargo/bin:$PATH" cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
RUSTUP_HOME="$HOME/.rustup" PATH="$HOME/.cargo/bin:$PATH" cargo test --manifest-path src-tauri/Cargo.toml
RUSTUP_HOME="$HOME/.rustup" PATH="$HOME/.cargo/bin:$PATH" cargo clippy --manifest-path src-tauri/Cargo.toml --features app-store -- -D warnings
RUSTUP_HOME="$HOME/.rustup" PATH="$HOME/.cargo/bin:$PATH" cargo test --manifest-path src-tauri/Cargo.toml --features app-store
git diff --check
```

Ignored native tests are not passed native QA. Run safe disposable fixtures,
clean them up, and report untested privileged behavior. Do not alter vendor
services. Install dependencies only after a manifest change or missing-tool
failure. Validate changed workflows and execute changed scripts end to end
before relying on them; a missing validator is not a passed check.

Land reviewed release changes through the repository's normal process, observing
user/host approval requirements for commits, merges, and publication. Use native
PR tools when provided; include required commit trailers. Re-read merged source
and CI before tagging. Freeze the release commit and dispatch both channels on
its tag/ref, never a moving `main`. Any further app change requires a new
candidate and rerunning affected gates.

## Execute, observe, and recover

Follow the runbook; never use `pnpm appstore:release` as a preparation command.
Verify its actual upload/submission side effects first. Cross-channel builds
share target/output paths locally; preserve channel copies before switching
features and serialize builds. Different features must never be mislabeled.

Observe known run IDs to completion, read failed logs, and repair the actual
cause. No unsigned fallback, skipped notarization, invented QA, blind duplicate
uploads, or overwritten releases. If source changes after a tag, do not move
that tag; prepare a new version or explicitly approved retry strategy.

One blocked channel must not be labeled successful because the other passed.
With the default independent-publication policy, continue safe work on the
healthy channel and record version alignment as pending. With a requested
simultaneous-publication policy, keep both nonpublic until both are ready.

Return version/source, public links, artifact/checksum locations, per-channel
stage, verified evidence, and exact remaining user actions. Distinguish
`built`, `signed`, `notarized`, `uploaded`, `processing`, `TestFlight verified`,
`submitted`, `approved`, and `public`. Never claim the next stage from evidence
of an earlier stage. Mark done only after the requested stages are verified;
if blocked, report completed work and the precise external gate.
