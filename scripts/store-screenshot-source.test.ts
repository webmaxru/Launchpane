import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readCaptureManifest, SCREENSHOT_NAMES, sha256File, sourceDigest, type CaptureManifest } from "./store-screenshot-source"

let root: string
let manifest: CaptureManifest

function saveManifest() {
  writeFileSync(join(root, "branding/screenshots/source/captures.json"), JSON.stringify(manifest))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "launchpane-capture-test-"))
  for (const directory of ["src", "src-tauri/src", "src-tauri/entitlements", "branding/screenshots/source"]) {
    mkdirSync(join(root, directory), { recursive: true })
  }
  writeFileSync(join(root, "package.json"), '{"version":"1.2.1"}')
  for (const path of ["pnpm-lock.yaml", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock",
    "src-tauri/tauri.conf.json", "src-tauri/tauri.app-store.conf.json", "src-tauri/entitlements/app-store.plist"]) {
    writeFileSync(join(root, path), "fixture")
  }
  writeFileSync(join(root, "src/App.tsx"), "current native UI")
  for (const name of SCREENSHOT_NAMES) writeFileSync(join(root, `branding/screenshots/source/${name}.png`), name)
  manifest = {
    version: "1.2.1", buildNumber: "202610101605", distribution: "app-store",
    sourceDigest: sourceDigest(root), captureMethod: "native-local-sandbox", submittedBuildQA: false,
    screenshots: Object.fromEntries(SCREENSHOT_NAMES.map((name) => [
      name, { sha256: sha256File(join(root, `branding/screenshots/source/${name}.png`)), description: name, privacyRedactions: [] },
    ])),
  }
  saveManifest()
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe("native Store screenshot provenance", () => {
  it("accepts complete current native captures", () => {
    expect(readCaptureManifest(root)).toEqual(manifest)
  })

  it("requires recapture after app code changes", () => {
    writeFileSync(join(root, "src/App.tsx"), "changed native UI")
    expect(() => readCaptureManifest(root)).toThrow("App sources changed after capture")
  })

  it("rejects a changed capture even if it has the same filename", () => {
    writeFileSync(join(root, "branding/screenshots/source/overview.png"), "stale mockup")
    expect(() => readCaptureManifest(root)).toThrow("Native capture hash mismatch")
  })

  it("rejects another edition or version", () => {
    manifest.version = "1.2.0"
    saveManifest()
    expect(() => readCaptureManifest(root)).toThrow("current Store edition")
  })

  it("does not invalidate captures for test-only changes", () => {
    writeFileSync(join(root, "src/App.test.tsx"), "more assertions")
    expect(readCaptureManifest(root)).toEqual(manifest)
  })

  it("requires provenance instead of using historical SVGs", () => {
    rmSync(join(root, "branding/screenshots/source/captures.json"))
    writeFileSync(join(root, "branding/screenshots/source/overview.svg"), "<svg/>")
    expect(() => readCaptureManifest(root)).toThrow()
    expect(readFileSync(join(root, "branding/screenshots/source/overview.svg"), "utf8")).toBe("<svg/>")
  })
})
