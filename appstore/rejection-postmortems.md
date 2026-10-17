# App Review rejection post-mortems

## 1.3.3: unused `com.apple.security.network.server` (October 2026)

### What happened

App Review's automated analysis flagged build 1.3.3 (202610162230) for
requesting `com.apple.security.network.server` without matching functionality.
Launchpane never listens for incoming connections. Apple asks for the minimum
set of entitlements.

### Timeline

| Date | Event |
| --- | --- |
| 2026-10-10 | `5de09a6` fixed a blank sandboxed window by adding `network.client` **and** `network.server` together. Only one was needed, but the other was never removed. |
| 2026-10-10 | The same change made `macos-app-store.sh` and the verifier *require* both keys, which locked in the over-grant. |
| 2026-10-15 | 1.2.1 was rejected under 2.4.5(i) for `get-task-allow` and the temporary file exceptions. |
| 2026-10-15 | `b8bc0c3` removed exactly the listed keys. Docs and review notes justified the network keys with "support Tauri/WebKit" but no evidence. |
| 2026-10-16 | 1.3.3 was submitted and then rejected for `network.server`. |
| 2026-10-16 | A removal test on macOS 12.7.6 showed that a sandbox + `network.client` build renders, while a build without network keys is blank. `network.server` is unnecessary. |

### Root causes

1. **Paired keys were not isolated.** A debugging fix added two entitlements at
   once, and nobody tested which one resolved the bug.
2. **The verifier encoded the current state, not justified necessity.** The
   allowlist *required* `network.server`, so automation enforced the over-grant
   instead of catching it.
3. **The remediation followed the list, not the rule.** The 2.4.5(i) fix
   removed the keys Apple enumerated. It did not apply the guideline's principle
   to the entire entitlement set: every entitlement needs matching functionality.
4. **Unverified wording.** Review notes said "network client/server entitlements
   support Tauri/WebKit", which repeated the assumption to Apple.

### Prevention (implemented)

- **Minimal entitlements.** `src-tauri/entitlements/app-store.plist` now contains
  only App Sandbox, `network.client` and user-selected read/write.
- **Justification map.** `scripts/verify-store-entitlements.py` keeps a
  `REQUIRED` justification map. Every allowed key must name its shipped feature
  and evidence. A `FORBIDDEN` map rejects `network.server`, `get-task-allow` and
  every temporary exception, and explains why. Unknown keys still fail.
- **Packaging check.** `scripts/macos-app-store.sh` fails if the signed app
  requests `network.server`.
- **Regression tests.** `scripts/release-pipeline.test.mjs` covers
  `network.server`, a false `network.client`, and an unjustified extra
  file entitlement.
- **Release runbook gate.** The `release-up` skill and its runbook now run a
  mandatory entitlement and review-requirement audit for every candidate and
  every Apple message:
  - Read the full message and the guideline.
  - Track every requirement.
  - Re-justify the whole entitlement set by native removal testing, not only
    the keys Apple named.
  - Update the verifier.
  - Record a post-mortem.
- **Documentation.** `appstore/sandbox-exceptions.md` records each entitlement's
  functionality and removal-test evidence.
