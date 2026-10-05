/**
 * Generates Mac App Store screenshot assets from source mockups.
 *
 * App Store Connect accepts these canvas sizes for macOS screenshots:
 * 1280x800, 1440x900, 2560x1600, 2880x1800.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, readdirSync, existsSync, writeFileSync } from "node:fs"
import { basename, join, parse } from "node:path"

const SOURCE_DIR = join(process.cwd(), "branding", "screenshots", "source")
const OUTPUT_DIR = join(process.cwd(), "branding", "store", "screenshots")
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1600 },
  { width: 2880, height: 1800 },
] as const

function sips(args: string[]): void {
  execFileSync("/usr/bin/sips", args, { stdio: "ignore" })
}

function ensureSources(): string[] {
  if (!existsSync(SOURCE_DIR)) {
    mkdirSync(SOURCE_DIR, { recursive: true })
  }

  const files = readdirSync(SOURCE_DIR)
  const svgFiles = files.filter((name) => name.toLowerCase().endsWith(".svg"))
  if (svgFiles.length > 0) {
    return svgFiles
  }

  const defaults = [
    "overview.svg",
    "detail.svg",
    "login-items.svg",
    "logs.svg",
  ]
  for (const file of defaults) {
    const fullPath = join(SOURCE_DIR, file)
    if (!existsSync(fullPath)) {
      writeFileSync(fullPath, "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1280\" height=\"800\"></svg>")
    }
  }
  return defaults
}

function renderSvgToPng(sourcePath: string, targetPath: string, maxDimension: number): void {
  const outputDir = join(SOURCE_DIR, ".tmp-render")
  mkdirSync(outputDir, { recursive: true })
  execFileSync("/usr/bin/qlmanage", ["-t", "-s", String(maxDimension), "-o", outputDir, sourcePath], {
    stdio: "ignore",
  })
  const base = basename(sourcePath, ".svg")
  const generated = join(outputDir, `${base}.svg.png`)
  sips(["-s", "format", "png", generated, "--out", targetPath])
}

function main(): void {
  const sourceFiles = ensureSources()
  mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const { width, height } of SIZES) {
    const sizeDir = join(OUTPUT_DIR, `${width}x${height}`)
    mkdirSync(sizeDir, { recursive: true })

    for (const file of sourceFiles) {
      const parsed = parse(file)
      const sourcePath = join(SOURCE_DIR, file)
      const out = join(sizeDir, `${parsed.name}.png`)
      const renderTarget = join(SOURCE_DIR, ".tmp-render", `${parsed.name}.png`)
      renderSvgToPng(sourcePath, renderTarget, Math.max(width, height))
      sips(["-z", String(height), String(width), renderTarget, "--out", out])
    }

    console.log(`Wrote ${sourceFiles.length} screenshot(s) at ${width}x${height}`)
  }
}

main()
