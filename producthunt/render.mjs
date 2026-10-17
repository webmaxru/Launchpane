#!/usr/bin/env node
/**
 * Renders the Product Hunt gallery, social cards and thumbnails into producthunt/assets/
 * from assets/templates/frames.html, assets/frames.js and the native captures in capture/.
 * Requires macOS (sips), Google Chrome or Microsoft Edge, and ffmpeg for the animated GIF.
 *
 *   pnpm producthunt:assets                         # everything
 *   node producthunt/render.mjs gallery-2-sources   # selected frame ids
 */
import { execFileSync, spawn } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { pathToFileURL } from "node:url"
import { assets, imageSize, loadFrames, root } from "./lib.mjs"

const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].find(existsSync)
if (!chrome) throw new Error("Google Chrome or Microsoft Edge is required to render the Product Hunt visuals.")

const template = pathToFileURL(join(assets, "templates", "frames.html")).href
const { frames, icons } = loadFrames()
const selected = process.argv.slice(2)
const unknown = selected.filter(id => !frames.some(f => f.id === id))
if (unknown.length) throw new Error(`Unknown frame id(s): ${unknown.join(", ")}`)
const queue = frames.filter(f => !selected.length || selected.includes(f.id))

/**
 * Screenshots one frame. Headless Chrome can keep running after it writes the file, so the
 * process is stopped once the PNG exists and its size is stable.
 */
function screenshot(hash, width, height, scale, target) {
  rmSync(target, { force: true })
  const profile = mkdtempSync(join(tmpdir(), "launchpane-ph-"))
  const child = spawn(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profile}`, `--window-size=${width},${height}`, `--force-device-scale-factor=${scale}`,
    "--virtual-time-budget=5000", `--screenshot=${target}`, `${template}#${hash}`,
  ], { stdio: "ignore" })
  const exited = new Promise(resolve => child.once("exit", resolve))
  return new Promise((resolve, reject) => {
    let lastSize = -1
    let settled = false
    const written = () => existsSync(target) && statSync(target).size > 0
    const finish = error => {
      if (settled) return
      settled = true
      clearInterval(poll)
      clearTimeout(timer)
      child.kill("SIGKILL")
      exited.then(() => rmSync(profile, { recursive: true, force: true }))
      if (error) reject(error)
      else resolve()
    }
    const poll = setInterval(() => {
      if (!written()) return
      const size = statSync(target).size
      if (size === lastSize) finish()
      lastSize = size
    }, 250)
    const timer = setTimeout(() => finish(new Error(`Timed out rendering #${hash}`)), 45000)
    exited.then(() => (written() ? finish() : finish(new Error(`Chrome exited without writing ${target}`))))
  })
}

async function pool(tasks, size) {
  const results = []
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const index = next++
      results[index] = await tasks[index]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, worker))
  return results
}

function report(target) {
  const { width, height } = imageSize(target)
  const kb = Math.round(statSync(target).size / 1024)
  console.log(`  ${relative(root, target)}  ${width}×${height}  ${kb} KB`)
}

const stills = queue.filter(f => !f.animation)
console.log(`Rendering ${stills.length} still frame(s) with ${chrome.split("/").pop()}`)
await pool(stills.map(f => async () => {
  const target = join(assets, f.out)
  mkdirSync(dirname(target), { recursive: true })
  await screenshot(f.id, f.width, f.height, f.scale, target)
  report(target)
}), 4)

for (const f of queue.filter(frame => frame.animation)) {
  const { frames: count, fps } = f.animation
  const work = mkdtempSync(join(tmpdir(), "launchpane-ph-gif-"))
  try {
    console.log(`Rendering ${count} animation frames for ${f.id}`)
    await pool(Array.from({ length: count }, (_, i) => () =>
      screenshot(`${f.id}/t=${(i / count).toFixed(4)}`, f.width, f.height, f.scale, join(work, `f${String(i).padStart(3, "0")}.png`))), 6)
    const target = join(assets, f.out)
    mkdirSync(dirname(target), { recursive: true })
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(work, "f%03d.png"),
      "-vf", "split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a",
      "-loop", "0", target,
    ], { stdio: "inherit" })
    report(target)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

if (!selected.length) {
  console.log("Copying icons")
  for (const icon of icons) {
    const target = join(assets, icon.out)
    mkdirSync(dirname(target), { recursive: true })
    const source = join(root, icon.source)
    if (imageSize(source).width === icon.size) copyFileSync(source, target)
    else execFileSync("/usr/bin/sips", ["-z", String(icon.size), String(icon.size), source, "--out", target], { stdio: "pipe" })
    report(target)
  }
}
