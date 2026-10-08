/**
 * Generates Mac App Store screenshot assets from source mockups.
 *
 * App Store Connect accepts these canvas sizes for macOS screenshots:
 * 1280x800, 1440x900, 2560x1600, 2880x1800.
 */
import { execFileSync, spawn } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, parse } from "node:path"
import { pathToFileURL } from "node:url"

const SOURCE_DIR = join(process.cwd(), "branding", "screenshots", "source")
const OUTPUT_DIR = join(process.cwd(), "branding", "store", "screenshots")
const MASTER_ICON = join(process.cwd(), "branding", "launchpane-icon.svg")
const ICON_VIEWBOX = 1024
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1600 },
  { width: 2880, height: 1800 },
] as const

function sips(args: string[]): void {
  execFileSync("/usr/bin/sips", args, { stdio: "ignore" })
}

/** Returns the drawable contents of an SVG, without its root element. */
function svgBody(markup: string): string {
  const opening = markup.indexOf(">", markup.indexOf("<svg"))
  const closing = markup.lastIndexOf("</svg>")
  return markup.slice(opening + 1, closing).trim()
}

/**
 * Replaces `<g data-app-icon x=".." y=".." size=".."/>` placeholders in a mockup
 * with the current brand mark, so screenshots always match the shipping header.
 */
function inlineAppIcon(markup: string): string {
  const placeholder =
    /<g\s+data-app-icon\s+x="([\d.]+)"\s+y="([\d.]+)"\s+size="([\d.]+)"\s*\/>/g
  if (!placeholder.test(markup)) return markup
  placeholder.lastIndex = 0

  const icon = svgBody(readFileSync(MASTER_ICON, "utf8"))
  let index = 0

  return markup.replace(placeholder, (_match, x, y, size) => {
    index += 1
    // Namespace ids so the mark's gradients cannot collide with the mockup's.
    const scoped = icon
      .replace(/id="([A-Za-z][\w-]*)"/g, (_m, id: string) => `id="s${index}${id}"`)
      .replace(/url\(#([A-Za-z][\w-]*)\)/g, (_m, id: string) => `url(#s${index}${id})`)
      .replace(
        /(xlink:href|href)="#([A-Za-z][\w-]*)"/g,
        (_m, attr: string, id: string) => `${attr}="#s${index}${id}"`
      )
    const scale = Number(size) / ICON_VIEWBOX
    return `<g transform="translate(${x},${y}) scale(${scale})">${scoped}</g>`
  })
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

function browserPath(): string {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ]
  const browser = candidates.find(existsSync)
  if (!browser) {
    throw new Error("Google Chrome or Microsoft Edge is required to render App Store screenshots")
  }
  return browser
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function renderSvgToPng(
  sourcePath: string,
  targetPath: string,
  width: number,
  height: number,
): Promise<void> {
  rmSync(targetPath, { force: true })
  const profile = mkdtempSync(join(tmpdir(), "launchpane-screenshot-"))
  const child = spawn(
    browserPath(),
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-sync",
      "--hide-scrollbars",
      "--metrics-recording-only",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--screenshot=${targetPath}`,
      pathToFileURL(sourcePath).href,
    ],
    { stdio: "ignore", detached: true },
  )

  try {
    for (let attempt = 0; attempt < 600; attempt += 1) {
      if (existsSync(targetPath) && statSync(targetPath).size > 0) return
      if (child.exitCode !== null) {
        throw new Error(`Screenshot browser exited with code ${child.exitCode}`)
      }
      await sleep(100)
    }
    throw new Error(`Timed out rendering ${sourcePath}`)
  } finally {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM")
      } catch {
        // The renderer already exited.
      }
    }
    await sleep(250)
    rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
}

async function main(): Promise<void> {
  const sourceFiles = ensureSources()
  rmSync(join(SOURCE_DIR, ".tmp-render"), { recursive: true, force: true })
  mkdirSync(join(SOURCE_DIR, ".tmp-render"), { recursive: true })
  mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const file of sourceFiles) {
    const parsed = parse(file)
    const sourcePath = join(SOURCE_DIR, file)
    const preparedPath = join(SOURCE_DIR, ".tmp-render", `${parsed.name}-prepared.svg`)
    writeFileSync(preparedPath, inlineAppIcon(readFileSync(sourcePath, "utf8")), "utf8")
    const renderTarget = join(SOURCE_DIR, ".tmp-render", `${parsed.name}-master.png`)
    await renderSvgToPng(preparedPath, renderTarget, 2880, 1800)

    for (const { width, height } of SIZES) {
      const sizeDir = join(OUTPUT_DIR, `${width}x${height}`)
      const out = join(sizeDir, `${parsed.name}.png`)
      const resizedTarget = join(SOURCE_DIR, ".tmp-render", `${parsed.name}-${width}.png`)
      const opaqueTarget = join(SOURCE_DIR, ".tmp-render", `${parsed.name}-${width}.jpg`)
      mkdirSync(sizeDir, { recursive: true })
      sips(["-z", String(height), String(width), renderTarget, "--out", resizedTarget])
      sips(["-s", "format", "jpeg", "-s", "formatOptions", "100", resizedTarget, "--out", opaqueTarget])
      sips(["-s", "format", "png", opaqueTarget, "--out", out])
    }
  }

  for (const { width, height } of SIZES) {
    console.log(`Wrote ${sourceFiles.length} screenshot(s) at ${width}x${height}`)
  }
}

await main()
