import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const APP_BUNDLE = join(ROOT, "src-tauri", "target", "release", "bundle", "macos", "Launchpane.app")
const OUTPUT_DIR = join(ROOT, "release", "appstore")
const APPSTORE_META_DIR = join(ROOT, "appstore", "metadata")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

function ensureBundle(): void {
  if (!existsSync(APP_BUNDLE)) {
    throw new Error(`App bundle not found at ${APP_BUNDLE}. Run: pnpm app:build`)
  }
}

function copyDirectory(source: string, target: string): void {
  mkdirSync(target, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const src = join(source, entry.name)
    const dst = join(target, entry.name)
    if (entry.isDirectory()) {
      copyDirectory(src, dst)
    } else {
      cpSync(src, dst)
    }
  }
}

function main(): void {
  ensureBundle()

  rmSync(OUTPUT_DIR, { recursive: true, force: true })
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const appPath = join(OUTPUT_DIR, "Launchpane.app")
  cpSync(APP_BUNDLE, appPath, { recursive: true })

  const packageJson = readJson<{ name: string; version: string }>(join(ROOT, "package.json"))
  const metadataTarget = join(OUTPUT_DIR, "metadata")
  copyDirectory(APPSTORE_META_DIR, metadataTarget)

  const brandDir = join(ROOT, "branding", "store")
  if (existsSync(brandDir)) {
    copyDirectory(brandDir, join(OUTPUT_DIR, "branding"))
  }

  const manifest = {
    name: packageJson.name,
    version: packageJson.version,
    bundleIdentifier: "com.webmaxru.launchpane",
    appName: "Launchpane",
    bundlePath: "Launchpane.app",
    generatedAt: new Date().toISOString(),
    platform: "macOS",
    notes: [
      "Prepared for App Store Connect review.",
      "Includes the build, metadata, and graphics pack for manual upload.",
      "Review the files in metadata/en-US before submission."
    ],
  }

  writeFileSync(join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(
    join(OUTPUT_DIR, "README.txt"),
    [
      "Launchpane App Store release package",
      "",
      `App bundle: ${manifest.bundlePath}`,
      `Bundle ID: ${manifest.bundleIdentifier}`,
      `Version: ${manifest.version}`,
      "",
      "Submission checklist:",
      "1. Review metadata/en-US before uploading.",
      "2. Verify the screenshots match the accepted App Store dimensions.",
      "3. Upload the Launchpane.app and metadata to App Store Connect.",
      "4. Submit for review with the release notes."
    ].join("\n") + "\n"
  )

  console.log(`Prepared App Store package at ${OUTPUT_DIR}`)
}

main()
