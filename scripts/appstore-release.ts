import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { readCaptureManifest } from "./store-screenshot-source.ts"

const ROOT = process.cwd()
const OUTPUT_DIR = join(ROOT, "release", "appstore")
const SOURCE_METADATA = join(ROOT, "appstore", "metadata", "en-US")
const SCREENSHOTS = join(ROOT, "branding", "store", "screenshots", "2880x1800")

const metadataFiles: Record<string, string> = {
  "description.txt": "description.txt",
  "keywords.txt": "keywords.txt",
  "marketing-url.txt": "marketing_url.txt",
  "name.txt": "name.txt",
  "privacy-policy-url.txt": "privacy_url.txt",
  "promotional-text.txt": "promotional_text.txt",
  "release-notes.txt": "release_notes.txt",
  "subtitle.txt": "subtitle.txt",
  "support-url.txt": "support_url.txt",
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function required(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Required App Store artifact is missing: ${path}`)
  }
}

function main(): void {
  const captures = readCaptureManifest(ROOT)
  const packageJson = readJson<{ name: string; version: string }>(join(ROOT, "package.json"))
  const tauriConfig = readJson<{ version: string; identifier: string; productName: string }>(
    join(ROOT, "src-tauri", "tauri.conf.json"),
  )

  if (packageJson.version !== tauriConfig.version) {
    throw new Error(
      `Version mismatch: package.json=${packageJson.version}, tauri.conf.json=${tauriConfig.version}`,
    )
  }

  rmSync(join(OUTPUT_DIR, "fastlane"), { recursive: true, force: true })
  const metadataTarget = join(OUTPUT_DIR, "fastlane", "metadata", "en-US")
  const screenshotsTarget = join(OUTPUT_DIR, "fastlane", "screenshots", "en-US")
  mkdirSync(metadataTarget, { recursive: true })
  mkdirSync(screenshotsTarget, { recursive: true })

  for (const [sourceName, targetName] of Object.entries(metadataFiles)) {
    const source = join(SOURCE_METADATA, sourceName)
    required(source)
    copyFileSync(source, join(metadataTarget, targetName))
  }

  for (const name of ["overview.png", "detail.png", "login-items.png", "logs.png"]) {
    const source = join(SCREENSHOTS, name)
    required(source)
    copyFileSync(source, join(screenshotsTarget, name))
  }

  cpSync(join(ROOT, "branding", "store", "appstore-icon-1024.png"), join(OUTPUT_DIR, "appstore-icon-1024.png"))
  cpSync(join(ROOT, "appstore", "sandbox-exceptions.md"), join(OUTPUT_DIR, "sandbox-exceptions.md"))
  cpSync(join(ROOT, "appstore", "review-recording.md"), join(OUTPUT_DIR, "review-recording.md"))
  cpSync(join(SOURCE_METADATA, "review-notes.txt"), join(OUTPUT_DIR, "review-notes.txt"))
  cpSync(join(SOURCE_METADATA, "review-response.txt"), join(OUTPUT_DIR, "review-response.txt"))
  cpSync(join(ROOT, "appstore", "age-rating.json"), join(OUTPUT_DIR, "age-rating.json"))
  cpSync(join(ROOT, "appstore", "app-privacy.json"), join(OUTPUT_DIR, "app-privacy.json"))
  cpSync(join(ROOT, "branding", "screenshots", "source", "captures.json"), join(OUTPUT_DIR, "screenshot-captures.json"))

  const manifest = {
    appName: tauriConfig.productName,
    packageName: packageJson.name,
    version: packageJson.version,
    bundleIdentifier: tauriConfig.identifier,
    buildNumber: process.env.APP_BUILD_NUMBER ?? captures.buildNumber,
    platform: "macOS",
    package: existsSync(join(OUTPUT_DIR, "Launchpane.pkg")) ? "Launchpane.pkg"
      : existsSync(join(OUTPUT_DIR, "Launchpane-unsigned.pkg")) ? "Launchpane-unsigned.pkg" : null,
    metadata: "fastlane/metadata",
    screenshots: "fastlane/screenshots",
    generatedAt: new Date().toISOString(),
    screenshotSourceDigest: captures.sourceDigest,
    screenshotCaptureBuildNumber: captures.buildNumber,
    exactSubmittedBuildQA: false,
  }

  writeFileSync(join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Prepared App Store Connect assets at ${OUTPUT_DIR}`)
}

main()
