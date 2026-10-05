/**
 * Generates Mac App Store screenshot assets from raw captures.
 *
 * Place raw window captures (PNG/JPG) in `branding/screenshots/source/`, then run:
 *   pnpm store:screenshots
 *
 * Every source image is scaled to fit and padded onto each canvas size that
 * App Store Connect accepts for macOS apps.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, readdirSync, existsSync } from "node:fs"
import { join, parse } from "node:path"

const SOURCE_DIR = join(process.cwd(), "branding", "screenshots", "source")
const OUTPUT_DIR = join(process.cwd(), "branding", "store", "screenshots")

/** Canvas sizes accepted by App Store Connect for macOS apps. */
const SIZES: ReadonlyArray<{ width: number; height: number }> = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1600 },
  { width: 2880, height: 1800 },
]

/** Neutral canvas colour used to pad captures that do not match the aspect ratio. */
const PAD_COLOR = "F5F6FA"

function sips(args: string[]): void {
  execFileSync("/usr/bin/sips", args, { stdio: "ignore" })
}

function main(): void {
  if (!existsSync(SOURCE_DIR)) {
    mkdirSync(SOURCE_DIR, { recursive: true })
  }

  const sources = readdirSync(SOURCE_DIR).filter((name) => /\.(png|jpe?g)$/i.test(name))

  if (sources.length === 0) {
    console.log(`No captures found. Add screenshots to ${SOURCE_DIR} and run again.`)
    return
  }

  for (const { width, height } of SIZES) {
    const sizeDir = join(OUTPUT_DIR, `${width}x${height}`)
    mkdirSync(sizeDir, { recursive: true })

    for (const name of sources) {
      const out = join(sizeDir, `${parse(name).name}.png`)
      sips([
        "-s",
        "format",
        "png",
        "-Z",
        String(Math.max(width, height)),
        join(SOURCE_DIR, name),
        "--out",
        out,
      ])
      sips(["-p", String(height), String(width), "--padColor", PAD_COLOR, out, "--out", out])
    }

    console.log(`Wrote ${sources.length} screenshot(s) at ${width}x${height}`)
  }
}

main()
