#!/usr/bin/env node
// Checks the Product Hunt kit before launch: channel limits, placeholders, vote requests,
// listing consistency, referenced files, rendered assets, and capture provenance.
// Usage: node producthunt/verify.mjs   (or pnpm producthunt:verify)
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { assets, gifFrameCount, imageSize, kit, loadFrames, root } from "./lib.mjs"

const errors = []
const fail = (message) => errors.push(message)
const rel = (file) => relative(kit, file)
const MB = 1024 * 1024

// ---------------------------------------------------------------- copy

const PLACEHOLDERS = new Set(["PH_LINK", "WEEKDAY", "NAME", "PUBLICATION", "POST_ID"])

// X wraps every link to 23 characters. Bluesky and Threads count the link as typed, so the
// Product Hunt link is budgeted at a generous 60 characters there.
const TCO = 23
const PH_LINK_TYPED = 60
const URL = /https?:\/\/[^\s)>\]]+/g
const BARE_DOMAIN = /(?<![\w@/.])(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|no)(?:\/[^\s)>\]]*)?/gi

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
const graphemes = (text) => [...segmenter.segment(text)].length

// twitter-text v3: these code point ranges weigh 1, everything else 2, and emoji 2.
function xWeight(text) {
  let weight = 0
  for (const { segment } of segmenter.segment(text)) {
    if (/\p{Extended_Pictographic}/u.test(segment)) {
      weight += 2
      continue
    }
    for (const char of segment) {
      const code = char.codePointAt(0)
      const light =
        code <= 4351 ||
        (code >= 8192 && code <= 8205) ||
        (code >= 8208 && code <= 8223) ||
        (code >= 8242 && code <= 8247)
      weight += light ? 1 : 2
    }
  }
  return weight
}

function xLength(text) {
  let links = 0
  let rest = text.replaceAll("<PH_LINK>", () => {
    links += TCO
    return ""
  })
  rest = rest.replace(URL, () => {
    links += TCO
    return ""
  })
  // X may or may not link a bare domain; count whichever is longer.
  rest = rest.replace(BARE_DOMAIN, (domain) => {
    links += Math.max(domain.length, TCO)
    return ""
  })
  return xWeight(rest) + links
}

const mastodonLength = (text) =>
  [...text.replaceAll("<PH_LINK>", "x".repeat(TCO)).replace(URL, "x".repeat(TCO))].length
const typedLength = (text) => graphemes(text.replaceAll("<PH_LINK>", "x".repeat(PH_LINK_TYPED)))

const NO_PRODUCT_HUNT = /product\s*hunt|producthunt|<PH_LINK>/i

// limit: maximum length; count: how the network counts; noProductHunt: must not mention it.
const CHANNELS = {
  "x-post": { label: "X post", limit: 280, count: xLength },
  "bluesky-post": { label: "Bluesky post", limit: 300, count: typedLength },
  "mastodon-post": { label: "Mastodon post", limit: 500, count: mastodonLength },
  "threads-post": { label: "Threads post", limit: 500, count: typedLength },
  "linkedin-post": { label: "LinkedIn post", limit: 3000, count: graphemes },
  "hn-title": { label: "Show HN title", limit: 80, count: graphemes, noProductHunt: true, singleLine: true },
  "hn-text": { label: "Show HN text", limit: 4000, count: graphemes, noProductHunt: true },
  "hn-reply": { label: "HN reply", limit: 4000, count: graphemes, noProductHunt: true },
  "reddit-title": { label: "Reddit title", limit: 300, count: graphemes, noProductHunt: true, singleLine: true },
  "reddit-body": { label: "Reddit body", limit: 40000, count: graphemes, noProductHunt: true },
  "ph-comment": { label: "Maker comment", limit: 3000, count: graphemes },
  reply: { label: "Reply", limit: 1500, count: graphemes },
  email: { label: "Email", limit: 3000, count: graphemes },
  dm: { label: "Direct message", limit: 500, count: graphemes },
  boilerplate: { label: "Boilerplate", limit: 1000, count: graphemes },
}

// Asking for votes is against Product Hunt's rules and the brand's voice.
const VOTE_REQUEST = [
  /\bupvot/i,
  /\bvote (?:for|on)\b/i,
  /\b(?:support|help) (?:us|me|our launch)\b/i,
  /\bcheck out (?:the|my|our) (?:launch|post)\b/i,
  /#1 product/i,
]

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : markdownFiles(path)
    return entry.name.endsWith(".md") ? [path] : []
  })
}

/** Fenced code blocks with their info string and starting line; indented fences included. */
function fencedBlocks(file) {
  const lines = readFileSync(file, "utf8").split("\n")
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^(\s*)(`{3,})([\w-]*)\s*$/)
    if (!open) continue
    const [, indent, ticks, info] = open
    const body = []
    let j = i + 1
    for (; j < lines.length; j++) {
      if (new RegExp(`^\\s*${ticks}\\s*$`).test(lines[j])) break
      body.push(lines[j].startsWith(indent) ? lines[j].slice(indent.length) : lines[j])
    }
    if (j === lines.length) fail(`${rel(file)}:${i + 1}: code fence is never closed`)
    blocks.push({ info, text: body.join("\n"), line: i + 1, file })
    i = j
  }
  return blocks
}

const markdown = markdownFiles(kit)
const blocks = markdown.flatMap(fencedBlocks)
const rows = []

for (const block of blocks) {
  const where = `${rel(block.file)}:${block.line}`
  const channel = CHANNELS[block.info]
  if (!channel) continue
  if (!block.text.trim()) fail(`${where}: empty ${channel.label}`)
  const length = channel.count(block.text)
  rows.push({ where, label: channel.label, length, limit: channel.limit })
  if (length > channel.limit) fail(`${where}: ${channel.label} is ${length}/${channel.limit}`)
  if (channel.singleLine && block.text.trim().includes("\n")) fail(`${where}: ${channel.label} must be one line`)
  if (channel.noProductHunt && NO_PRODUCT_HUNT.test(block.text)) {
    fail(`${where}: ${channel.label} must not mention or link Product Hunt`)
  }
  for (const pattern of VOTE_REQUEST) {
    if (pattern.test(block.text)) fail(`${where}: ${channel.label} reads like a vote request (${pattern})`)
  }
}

for (const file of [...markdown, join(kit, "listing.json")]) {
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((line, index) => {
    for (const [, name] of line.matchAll(/<([A-Z][A-Z0-9_]*)>/g)) {
      if (!PLACEHOLDERS.has(name)) fail(`${rel(file)}:${index + 1}: unknown placeholder <${name}>`)
    }
  })
}

const boilerplates = blocks.filter((block) => block.info === "boilerplate")
const wordTargets = [25, 50, 100]
if (boilerplates.length !== wordTargets.length) {
  fail(`press-kit.md: expected ${wordTargets.length} boilerplate blocks, found ${boilerplates.length}`)
}
boilerplates.forEach((block, index) => {
  const words = block.text.trim().split(/\s+/).length
  const target = wordTargets[index]
  if (target && Math.abs(words - target) > target * 0.15) {
    fail(`${rel(block.file)}:${block.line}: boilerplate is ${words} words, expected about ${target}`)
  }
})

if (blocks.filter((block) => block.info === "ph-comment").length !== 1) {
  fail("first-comment.md: expected exactly one ph-comment block")
}

// Backticked paths in the copy must exist, relative to the file, the kit, or the repo.
const PATH_TOKEN = /`([\w./-]+\.(?:png|gif|md|json|sh|mjs|js|html|plist))`/g
// Files in the awesome-list repositories that communities.md tells you to edit.
const EXTERNAL = new Set([
  "applications.json",
  "categories.json",
  "docs/CONTRIBUTING.md",
  "README-zh.md",
  "README-ja.md",
  "README-ko.md",
  ".github/contributing.md",
])
for (const file of markdown) {
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((line, index) => {
    for (const [, path] of line.matchAll(PATH_TOKEN)) {
      if (path.startsWith("/") || path.startsWith("~") || EXTERNAL.has(path)) continue
      const candidates = [join(dirname(file), path), join(kit, path), join(root, path)]
      if (!candidates.some((candidate) => existsSync(candidate))) {
        fail(`${rel(file)}:${index + 1}: referenced file not found: ${path}`)
      }
    }
  })
}

// ---------------------------------------------------------------- listing

const listing = JSON.parse(readFileSync(join(kit, "listing.json"), "utf8"))
const listingMd = readFileSync(join(kit, "listing.md"), "utf8")

if (graphemes(listing.tagline) > 60) fail(`listing.json: tagline is ${graphemes(listing.tagline)}/60`)
for (const alternate of listing.taglineAlternates ?? []) {
  if (graphemes(alternate) > 60) fail(`listing.json: tagline alternate is ${graphemes(alternate)}/60: ${alternate}`)
  if (!listingMd.includes(alternate)) fail(`listing.md is missing the tagline alternate: ${alternate}`)
}
const descriptionLength = graphemes(listing.description)
if (descriptionLength > 260) fail(`listing.json: description is ${descriptionLength}/260`)
if (!listingMd.includes(listing.tagline)) fail("listing.md does not contain the tagline from listing.json")
if (!listingMd.includes(listing.description)) fail("listing.md does not contain the description from listing.json")
const counted = listingMd.match(/Description \((\d+)\/260\)/)
if (!counted || Number(counted[1]) !== descriptionLength) {
  fail(`listing.md: description heading should read (${descriptionLength}/260)`)
}
if (!Array.isArray(listing.topics) || listing.topics.length < 1 || listing.topics.length > 3) {
  fail("listing.json: choose one to three topics")
}
for (const [name, url] of Object.entries(listing.links ?? {})) {
  if (!url.startsWith("https://")) fail(`listing.json: link "${name}" must be https`)
}
if (!Array.isArray(listing.gallery) || listing.gallery.length < 2 || listing.gallery.length > 8) {
  fail("listing.json: the gallery needs two to eight images")
}
for (const item of listing.gallery ?? []) {
  if (!existsSync(join(kit, item.file))) fail(`listing.json: gallery file not found: ${item.file}`)
  if (!item.caption?.trim() || !item.alt?.trim()) fail(`listing.json: ${item.file} needs a caption and alt text`)
  if (item.caption && !listingMd.includes(item.caption)) fail(`listing.md is missing the caption for ${item.file}`)
}
for (const file of Object.values(listing.thumbnail ?? {})) {
  if (typeof file === "string" && !existsSync(join(kit, file))) fail(`listing.json: thumbnail not found: ${file}`)
}

// ---------------------------------------------------------------- assets

const { frames, icons } = loadFrames()
const expected = new Set()

for (const frame of frames) {
  const file = join(assets, frame.out)
  expected.add(frame.out)
  if (!existsSync(file)) {
    fail(`assets/${frame.out} is missing; run pnpm producthunt:assets`)
    continue
  }
  const scale = frame.scale ?? 1
  const { width, height } = imageSize(file)
  if (width !== frame.width * scale || height !== frame.height * scale) {
    fail(`assets/${frame.out} is ${width}×${height}, expected ${frame.width * scale}×${frame.height * scale}`)
  }
  const bytes = statSync(file).size
  if (["gallery", "thumbnail"].includes(frame.kind) && bytes > 3 * MB) {
    fail(`assets/${frame.out} is ${(bytes / MB).toFixed(2)} MB; Product Hunt allows 3 MB`)
  }
  if (frame.animation && gifFrameCount(file) < 2) fail(`assets/${frame.out} is not animated`)
  for (const shot of frame.shots ?? []) {
    if (!existsSync(join(kit, "capture", shot.src))) fail(`${frame.id}: capture/${shot.src} not found`)
  }
}

for (const icon of icons ?? []) {
  const file = join(assets, icon.out)
  expected.add(icon.out)
  if (!existsSync(file)) {
    fail(`assets/${icon.out} is missing; run pnpm producthunt:assets`)
    continue
  }
  const { width, height } = imageSize(file)
  if (width !== icon.size || height !== icon.size) fail(`assets/${icon.out} is ${width}×${height}, expected ${icon.size}`)
}

for (const dir of ["gallery", "social", "thumbnail"]) {
  for (const name of readdirSync(join(assets, dir))) {
    if (/\.(png|gif|jpe?g)$/.test(name) && !expected.has(`${dir}/${name}`)) {
      fail(`assets/${dir}/${name} is not produced by frames.js; remove it or add a frame`)
    }
  }
}

// ---------------------------------------------------------------- captures

const captures = JSON.parse(readFileSync(join(kit, "capture", "captures.json"), "utf8"))
for (const [id, shot] of Object.entries(captures.screenshots ?? {})) {
  const file = join(kit, "capture", shot.file)
  if (!existsSync(file)) {
    fail(`capture/${shot.file} (${id}) is missing`)
    continue
  }
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex")
  if (hash !== shot.sha256) fail(`capture/${shot.file} does not match its sha256 in captures.json`)
}

// ---------------------------------------------------------------- report

const width = Math.max(...rows.map((row) => row.where.length))
console.log("Copy")
for (const row of rows) {
  const flag = row.length > row.limit ? "  OVER" : ""
  console.log(`  ${row.where.padEnd(width)}  ${row.label.padEnd(15)} ${String(row.length).padStart(5)}/${row.limit}${flag}`)
}
console.log(`\nListing: tagline ${graphemes(listing.tagline)}/60, description ${descriptionLength}/260, ${listing.gallery?.length ?? 0} gallery images`)
console.log(`Assets: ${expected.size} files checked; captures: ${Object.keys(captures.screenshots ?? {}).length} checksums`)

if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"}:`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}
console.log("\nProduct Hunt kit OK.")
