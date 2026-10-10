import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
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
