import { execFileSync } from "node:child_process"
import { join } from "node:path"
import { readCaptureManifest, SCREENSHOT_NAMES, SCREENSHOT_SIZES } from "./store-screenshot-source.ts"

const ROOT = process.cwd()
const SOURCE_DIR = join(ROOT, "branding", "screenshots", "source")
const OUTPUT_DIR = join(ROOT, "branding", "store", "screenshots")

readCaptureManifest(ROOT)
const jobs = SCREENSHOT_NAMES.flatMap(name => SCREENSHOT_SIZES.map(({ width, height }) => ({
  source: join(SOURCE_DIR, `${name}.png`),
  output: join(OUTPUT_DIR, `${width}x${height}`, `${name}.png`),
  width,
  height,
})))
execFileSync("/usr/bin/swift", [join(ROOT, "scripts/render-store-screenshots.swift")], {
  input: JSON.stringify(jobs),
  stdio: ["pipe", "inherit", "inherit"],
})
for (const { width, height } of SCREENSHOT_SIZES) {
  console.log(`Wrote ${SCREENSHOT_NAMES.length} native screenshot(s) at ${width}x${height}`)
}
