import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

export const SCREENSHOT_NAMES = ["overview", "detail", "login-items", "logs"] as const
export const SCREENSHOT_SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1600 },
  { width: 2880, height: 1800 },
] as const

export type CaptureManifest = {
  version: string
  buildNumber: string
  distribution: "app-store"
  sourceDigest: string
  captureMethod: "native-local-sandbox"
  submittedBuildQA: false
  screenshots: Record<string, { sha256: string; description: string; privacyRedactions: string[] }>
}

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

export function sourceDigest(root: string): string {
  const files = [
    "package.json", "pnpm-lock.yaml", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock",
    "src-tauri/tauri.conf.json", "src-tauri/tauri.app-store.conf.json",
    "src-tauri/entitlements/app-store.plist",
  ]
  const collect = (directory: string) => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`
      if (entry.isDirectory()) collect(path)
      else if (/\.(tsx?|css|svg|rs)$/.test(path) && !/\.(test|spec)\./.test(path) && !path.startsWith("src/test-utils/")) {
        files.push(path)
      }
    }
  }
  collect("src")
  collect("src-tauri/src")
  const hash = createHash("sha256")
  for (const path of files.sort()) hash.update(path).update("\0").update(readFileSync(join(root, path))).update("\0")
  return hash.digest("hex")
}

export function readCaptureManifest(root: string): CaptureManifest {
  const directory = join(root, "branding", "screenshots", "source")
  const manifest = JSON.parse(readFileSync(join(directory, "captures.json"), "utf8")) as CaptureManifest
  const version = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version
  if (manifest.version !== version || manifest.distribution !== "app-store"
      || manifest.captureMethod !== "native-local-sandbox" || manifest.submittedBuildQA !== false
      || !/^\d+$/.test(manifest.buildNumber)) {
    throw new Error("Native screenshot provenance is missing or does not describe the current Store edition.")
  }
  if (manifest.sourceDigest !== sourceDigest(root)) {
    throw new Error("App sources changed after capture. Recapture the native Store edition before generating assets.")
  }
  for (const name of SCREENSHOT_NAMES) {
    if (manifest.screenshots[name]?.sha256 !== sha256File(join(directory, `${name}.png`))) {
      throw new Error(`Native capture hash mismatch: ${name}.png. Do not substitute SVG/browser mockups.`)
    }
  }
  return manifest
}
