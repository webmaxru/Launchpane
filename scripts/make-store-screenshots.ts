import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readCaptureManifest, SCREENSHOT_NAMES, SCREENSHOT_SIZES } from "./store-screenshot-source.ts"

const ROOT = process.cwd()
const SOURCE_DIR = join(ROOT, "branding", "screenshots", "source")
const OUTPUT_DIR = join(ROOT, "branding", "store", "screenshots")

readCaptureManifest(ROOT)
const temporary = mkdtempSync(join(tmpdir(), "launchpane-store-images-"))
try {
  for (const name of SCREENSHOT_NAMES) {
    for (const { width, height } of SCREENSHOT_SIZES) {
      const sizeDir = join(OUTPUT_DIR, `${width}x${height}`)
      mkdirSync(sizeDir, { recursive: true })
      const resized = join(temporary, `${name}-${width}.png`)
      const opaque = join(temporary, `${name}-${width}.bmp`)
      const output = join(sizeDir, `${name}.png`)
      execFileSync("/usr/bin/sips", [
        "-z", String(height), String(width), join(SOURCE_DIR, `${name}.png`), "--out", resized,
      ], { stdio: "ignore" })
      execFileSync("/usr/bin/sips", ["-s", "format", "bmp", resized, "--out", opaque], { stdio: "ignore" })
      execFileSync("/usr/bin/sips", ["-s", "format", "png", opaque, "--out", output], { stdio: "ignore" })
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
for (const { width, height } of SCREENSHOT_SIZES) {
  console.log(`Wrote ${SCREENSHOT_NAMES.length} native screenshot(s) at ${width}x${height}`)
}
