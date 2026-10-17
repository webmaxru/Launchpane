// Shared helpers for producthunt/render.mjs and producthunt/verify.mjs.
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

export const kit = dirname(fileURLToPath(import.meta.url))
export const root = resolve(kit, "..")
export const assets = join(kit, "assets")

/** Loads assets/frames.js, the classic script shared with templates/frames.html. */
export function loadFrames() {
  const context = {}
  vm.runInNewContext(readFileSync(join(assets, "frames.js"), "utf8"), context, { filename: "frames.js" })
  const data = context.LAUNCHPANE_FRAMES
  if (!data?.frames?.length) throw new Error("assets/frames.js did not define LAUNCHPANE_FRAMES.frames")
  return data
}

/** Pixel size of a PNG, GIF or JPEG file, read from its header. */
export function imageSize(file) {
  const bytes = readFileSync(file)
  if (bytes.subarray(1, 4).toString("latin1") === "PNG") {
    return { type: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }
  if (bytes.subarray(0, 3).toString("latin1") === "GIF") {
    return { type: "gif", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset < bytes.length) {
      const marker = bytes[offset + 1]
      const length = bytes.readUInt16BE(offset + 2)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: "jpeg", width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) }
      }
      offset += 2 + length
    }
  }
  throw new Error(`Unsupported or corrupt image: ${file}`)
}

/** Number of frames in a GIF (image descriptors), used to confirm the thumbnail is animated. */
export function gifFrameCount(file) {
  const bytes = readFileSync(file)
  let count = 0
  for (let i = 0; i < bytes.length - 9; i++) {
    // Graphic Control Extension precedes every frame written by ffmpeg.
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) count++
  }
  return count
}
