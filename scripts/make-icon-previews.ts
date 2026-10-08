#!/usr/bin/env node
/**
 * Renders every icon concept in branding/concepts/ to transparent PNGs and
 * builds a side-by-side preview sheet (branding/concepts/preview.html).
 */
import { spawn } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, parse, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CONCEPT_DIR = join(ROOT, "branding", "concepts")
const PNG_DIR = join(CONCEPT_DIR, "png")
const MANIFEST = join(CONCEPT_DIR, "concepts.json")

type Concept = { id: string; title: string; description: string }

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
]

function chromeBinary(): string {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error("Google Chrome, Edge or Chromium is required to render previews")
  }
  return found
}

function render(source: string, target: string, size: number): Promise<void> {
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
        `--window-size=${size},${size}`,
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
      if (code === 0) resolvePromise()
      else rejectPromise(new Error(`Renderer failed for ${source} (code ${code})`))
    })
  })
}

function loadConcepts(): Concept[] {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Concept[]
  const available = new Set(
    readdirSync(CONCEPT_DIR)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => parse(file).name)
  )
  return manifest.filter((entry) => available.has(entry.id))
}

function buildSheet(concepts: Concept[], selected: string): string {
  const rows = concepts
    .map((concept) => {
      const src = `png/${concept.id}-1024.png`
      const light = [160, 128, 64, 32]
        .map(
          (size) =>
            `<div class="cell"><div class="light"><img src="${src}" width="${size}" height="${size}" alt=""></div><small>${size}px</small></div>`
        )
        .join("")
      const dark = [128, 32]
        .map(
          (size) =>
            `<div class="cell"><div class="dark"><img src="${src}" width="${size}" height="${size}" alt=""></div><small>${size}px dark</small></div>`
        )
        .join("")
      const badge =
        concept.id === selected ? '<em class="badge">in use</em>' : ""
      return `<div class="row"><div class="meta"><b>${concept.title}${badge}</b><span>${concept.description}</span><code>pnpm icons ${concept.id}</code></div><div class="sizes">${light}${dark}</div></div>`
    })
    .join("\n")

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Launchpane — icon concepts</title><style>
*{box-sizing:border-box}
body{margin:0;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#111}
h1{font-size:22px;margin:28px 32px 4px}
p.sub{margin:0 32px 18px;color:#666}
.row{display:flex;align-items:center;gap:28px;padding:20px 32px;border-top:1px solid #e5e5e5}
.meta{width:260px}
.meta b{display:block;font-size:17px;margin-bottom:4px}
.meta span{display:block;color:#666;font-size:12.5px;line-height:1.45}
.meta code{display:inline-block;margin-top:8px;font-size:11.5px;color:#444;background:#f3f3f5;border-radius:5px;padding:3px 7px}
.badge{margin-left:8px;font-style:normal;font-size:11px;font-weight:600;color:#0a7a52;background:#d8f5e9;border-radius:999px;padding:2px 8px;vertical-align:middle}
.sizes{display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap}
.cell{text-align:center}
.cell small{display:block;color:#999;margin-top:6px;font-size:11px}
.light{background:#f2f2f7;border-radius:14px;padding:10px}
.dark{background:#1c1c1e;border-radius:14px;padding:10px}
img{display:block}
</style></head><body>
<h1>Launchpane — icon concepts</h1>
<p class="sub">Every option has a fully transparent background. Shown at 160/128/64/32&nbsp;px on light and dark surfaces.</p>
${rows}
</body></html>
`
}

async function main(): Promise<void> {
  if (!existsSync(PNG_DIR)) mkdirSync(PNG_DIR, { recursive: true })
  const concepts = loadConcepts()

  for (const concept of concepts) {
    await render(
      join(CONCEPT_DIR, `${concept.id}.svg`),
      join(PNG_DIR, `${concept.id}-1024.png`),
      1024
    )
    console.log(`✓ ${concept.id}`)
  }

  const selectionFile = join(ROOT, "branding", "icon-concept.json")
  const selected = existsSync(selectionFile)
    ? ((JSON.parse(readFileSync(selectionFile, "utf8")) as { concept?: string })
        .concept ?? "")
    : ""

  writeFileSync(join(CONCEPT_DIR, "preview.html"), buildSheet(concepts, selected), "utf8")
  console.log("\nPreview sheet: branding/concepts/preview.html")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
