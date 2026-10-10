#!/usr/bin/env node
/**
 * Regenerates website social, favicon, and PWA assets in docs/assets/ from the
 * brand master icon and branding/social/og.html. Requires macOS (sips) and
 * Google Chrome or Microsoft Edge for the social card render.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const out = join(root, "docs", "assets")
const master = join(root, "branding", "launchpane-icon-1024.png")
const opaqueMaster = join(root, "branding", "store", "appstore-icon-1024.png")
mkdirSync(out, { recursive: true })

const sips = (source, size, target) =>
  execFileSync("/usr/bin/sips", ["-z", String(size), String(size), source, "--out", target], { stdio: "pipe" })

for (const size of [16, 32, 192, 512]) sips(master, size, join(out, `icon-${size}.png`))
sips(opaqueMaster, 180, join(out, "apple-touch-icon.png"))

// ICO container embedding the 16 and 32 px PNGs.
const images = [16, 32].map(size => readFileSync(join(out, `icon-${size}.png`)))
const header = Buffer.alloc(6 + 16 * images.length)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)
let offset = header.length
images.forEach((image, index) => {
  const size = index === 0 ? 16 : 32
  const entry = 6 + index * 16
  header.writeUInt8(size, entry)
  header.writeUInt8(size, entry + 1)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
})
writeFileSync(join(root, "docs", "favicon.ico"), Buffer.concat([header, ...images]))

const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].find(existsSync)
if (!chrome) throw new Error("Google Chrome or Microsoft Edge is required to render the social card.")
const profile = mkdtempSync(join(tmpdir(), "launchpane-social-"))
const target = join(out, "og-image.png")
rmSync(target, { force: true })
try {
  // Headless Chrome may keep running after the screenshot is written, so cap the wait.
  execFileSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${profile}`,
    "--window-size=1200,630", "--force-device-scale-factor=1",
    `--screenshot=${join(out, "og-image.png")}`,
    pathToFileURL(join(root, "branding", "social", "og.html")).href,
  ], { stdio: "pipe", timeout: 20000, killSignal: "SIGKILL" })
} catch (error) {
  if (!existsSync(target)) throw error
} finally {
  rmSync(profile, { recursive: true, force: true })
}
console.log("Generated favicon, touch icon, PWA icons, and og-image.png in docs/")
