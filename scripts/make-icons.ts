#!/usr/bin/env node
/**
 * Regenerates every Launchpane icon artefact from a single master concept SVG.
 *
 * Usage:
 *   node scripts/make-icons.ts                 # uses branding/icon-concept.json
 *   node scripts/make-icons.ts 02-ignition-switch
 */
import { execFileSync, spawn } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONCEPT_DIR = join(ROOT, "branding", "concepts")
const STORE_DIR = join(ROOT, "branding", "store")
const SELECTION_FILE = join(ROOT, "branding", "icon-concept.json")
const MASTER_SVG = join(ROOT, "branding", "launchpane-icon.svg")
const MASTER_PNG = join(ROOT, "branding", "launchpane-icon-1024.png")
const WORDMARK_SVG = join(ROOT, "branding", "launchpane-wordmark.svg")
const TMP = join(ROOT, "branding", ".tmp-icons")

const STORE_SIZES = [16, 32, 64, 128, 256, 512, 1024]

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
]

function chromeBinary(): string {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(
      "Google Chrome, Edge or Chromium is required to rasterise the icon SVGs"
    )
  }
  return found
}

function sips(args: string[]): string {
  return execFileSync("sips", args, { encoding: "utf8" })
}

/** Renders an SVG with a fully transparent backdrop. */
function renderTransparent(
  source: string,
  target: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      chromeBinary(),
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--default-background-color=00000000",
        `--screenshot=${target}`,
        `--window-size=${width},${height}`,
        "--virtual-time-budget=3000",
        `file://${source}`,
      ],
      { stdio: "ignore" }
    )
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      rejectPromise(new Error(`Timed out rendering ${source}`))
    }, 60_000)
    child.on("exit", (code) => {
      clearTimeout(timer)
      if (code === 0 && existsSync(target)) resolvePromise()
      else rejectPromise(new Error(`Renderer failed for ${source} (code ${code})`))
    })
  })
}

function resolveConcept(): string {
  const requested = process.argv[2]
  if (requested) return requested.replace(/\.svg$/, "")
  if (existsSync(SELECTION_FILE)) {
    const parsed = JSON.parse(readFileSync(SELECTION_FILE, "utf8")) as {
      concept?: string
    }
    if (parsed.concept) return parsed.concept
  }
  throw new Error(
    `No concept selected. Pass one of: ${readdirSync(CONCEPT_DIR)
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.replace(/\.svg$/, ""))
      .join(", ")}`
  )
}

/** Extracts the drawable body of an SVG so it can be nested inside another SVG. */
function svgBody(markup: string): string {
  const opening = markup.indexOf(">", markup.indexOf("<svg"))
  const closing = markup.lastIndexOf("</svg>")
  return markup.slice(opening + 1, closing).trim()
}

function buildWordmark(conceptMarkup: string): string {
  const body = svgBody(conceptMarkup)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400" viewBox="0 0 1600 400">
  <g transform="translate(40,24) scale(0.344)">
${body
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}
  </g>
  <text x="440" y="214" font-family="SF Pro Display, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="132" font-weight="600" fill="#1B2559" letter-spacing="-3">Launchpane</text>
  <text x="444" y="288" font-family="SF Pro Text, Helvetica Neue, Helvetica, Arial, sans-serif" font-size="42" font-weight="400" fill="#6B7699" letter-spacing="0.5">Launch agents, daemons and login items</text>
</svg>
`
}

async function main(): Promise<void> {
  const concept = resolveConcept()
  const conceptPath = join(CONCEPT_DIR, `${concept}.svg`)
  if (!existsSync(conceptPath)) {
    throw new Error(`Unknown concept: ${concept} (${conceptPath} is missing)`)
  }

  console.log(`▸ Using icon concept: ${concept}`)
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  mkdirSync(STORE_DIR, { recursive: true })

  const conceptMarkup = readFileSync(conceptPath, "utf8")

  // 1. Promote the concept to the master vector + raster icon.
  copyFileSync(conceptPath, MASTER_SVG)
  await renderTransparent(conceptPath, MASTER_PNG, 1024, 1024)
  console.log("✓ Master icon (transparent 1024 PNG)")

  // 2. Bundle icons for every platform target.
  execFileSync("pnpm", ["exec", "tauri", "icon", MASTER_PNG], {
    cwd: ROOT,
    stdio: "inherit",
  })
  // Launchpane is macOS-only; drop the mobile icon sets Tauri emits.
  for (const extra of ["ios", "android"]) {
    rmSync(join(ROOT, "src-tauri", "icons", extra), {
      recursive: true,
      force: true,
    })
  }
  console.log("✓ src-tauri/icons")

  // 3. Reference PNGs for the store listing and press kit (alpha preserved).
  for (const size of STORE_SIZES) {
    const target = join(STORE_DIR, `icon-${size}.png`)
    copyFileSync(MASTER_PNG, target)
    sips(["-z", String(size), String(size), target])
  }
  console.log(`✓ branding/store/icon-{${STORE_SIZES.join(",")}}.png`)

  // 4. App Store marketing icon. Apple rejects alpha here, so this is the one
  //    artefact that is deliberately flattened onto an opaque white canvas.
  const marketing = join(STORE_DIR, "appstore-icon-1024.png")
  const flattened = join(TMP, "marketing.jpg")
  copyFileSync(MASTER_PNG, flattened)
  sips(["-s", "format", "jpeg", "-s", "formatOptions", "best", flattened])
  sips(["-s", "format", "png", flattened, "--out", marketing])
  sips(["-z", "1024", "1024", marketing])
  console.log("✓ branding/store/appstore-icon-1024.png (opaque, no alpha)")

  // 5. macOS bundle icon mirror.
  copyFileSync(
    join(ROOT, "src-tauri", "icons", "icon.icns"),
    join(STORE_DIR, "Launchpane.icns")
  )
  console.log("✓ branding/store/Launchpane.icns")

  // 6. Wordmark lockup rebuilt around the selected icon.
  writeFileSync(WORDMARK_SVG, buildWordmark(conceptMarkup), "utf8")
  await renderTransparent(
    WORDMARK_SVG,
    join(STORE_DIR, "launchpane-wordmark-1600x400.png"),
    1600,
    400
  )
  console.log("✓ branding/launchpane-wordmark.svg + store PNG")

  // 7. Frontend asset so the in-app header shows the same mark as the bundle.
  const appIcon = join(ROOT, "src", "assets", "app-icon.svg")
  mkdirSync(dirname(appIcon), { recursive: true })
  copyFileSync(conceptPath, appIcon)
  console.log("✓ src/assets/app-icon.svg (in-app header mark)")

  // 8. Persist the selection so future runs are reproducible.
  writeFileSync(
    SELECTION_FILE,
    `${JSON.stringify({ concept, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8"
  )

  rmSync(TMP, { recursive: true, force: true })
  console.log(`\nAll icon artefacts rebuilt from "${concept}".`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
