import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { buildSite } from "./build-site.mjs"

async function fixture(t, html) {
  const directory = await mkdtemp(resolve(tmpdir(), "launchpane-site-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const source = resolve(directory, "docs")
  const output = resolve(directory, "output")
  await mkdir(resolve(source, "support"), { recursive: true })
  await writeFile(resolve(source, "index.html"), html)
  await writeFile(resolve(source, "support/index.html"), '<h1 id="help">Support</h1><a href="../">Home</a>')
  return { source, output }
}

test("builds nested pages, validates anchors, and disables Jekyll", async t => {
  const { source, output } = await fixture(t, '<a href="support/#help">Help</a><a href="https://github.com/webmaxru/Launchpane">Source</a>')
  await buildSite(source, output)
  assert.match(await readFile(resolve(output, "support/index.html"), "utf8"), /Support/)
  assert.equal(await readFile(resolve(output, ".nojekyll"), "utf8"), "")
})

test("rejects missing local assets", async t => {
  const { source, output } = await fixture(t, '<img src="missing.png">')
  await assert.rejects(buildSite(source, output), /Missing local target.*missing\.png/)
})

test("rejects broken cross-page anchors", async t => {
  const { source, output } = await fixture(t, '<a href="support/#missing">Help</a>')
  await assert.rejects(buildSite(source, output), /Missing anchor/)
})

test("requires a homepage", async t => {
  const { source, output } = await fixture(t, "")
  await rm(resolve(source, "index.html"))
  await assert.rejects(buildSite(source, output), /must contain index\.html/)
})

test("publishes both download choices and the unmodified official Mac App Store badge", async t => {
  const { output } = await fixture(t, "")
  const root = fileURLToPath(new URL("../", import.meta.url))
  await buildSite(resolve(root, "docs"), output)
  const homepage = await readFile(resolve(output, "index.html"), "utf8")
  const readme = await readFile(resolve(root, "README.md"), "utf8")
  const storeLink = 'href="https://apps.apple.com/no/app/launchpane/id6820735995?mt=12"'
  const releaseLink = 'href="https://github.com/webmaxru/Launchpane/releases/latest"'
  for (const document of [homepage, readme]) {
    assert.ok(document.includes(storeLink))
    assert.ok(document.includes(releaseLink))
    assert.match(document, /Standalone (?:— recommended|\(recommended\))/)
    assert.equal((document.match(/alt="Download on the Mac App Store"/g) ?? []).length, 1)
    assert.match(document, /mac-app-store-badge\.svg"[^>]*height="40"/)
  }
  const badge = await readFile(resolve(output, "assets/mac-app-store-badge.svg"))
  // Apple's original artwork, linked with its usage terms in README.md.
  assert.equal(createHash("sha256").update(badge).digest("hex"),
    "15111cd04380b58d95307dcb07f0b6b06304dbc7504c57fd9cdbf0a2f78e3a92")
  assert.deepEqual(badge, await readFile(resolve(root, "docs/assets/mac-app-store-badge.svg")))
})
