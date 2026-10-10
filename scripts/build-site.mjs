import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

async function htmlFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await htmlFiles(path))
    else if (entry.name.endsWith(".html")) files.push(path)
  }
  return files
}

export async function buildSite(source = "docs", output = "dist/site") {
  const root = resolve(source)
  const pages = await htmlFiles(root)
  if (!pages.includes(resolve(root, "index.html"))) {
    throw new Error("Website must contain index.html")
  }
  const ids = new Map()
  const references = []
  for (const page of pages) {
    const html = await readFile(page, "utf8")
    ids.set(page, new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1])))
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      references.push({ page, reference: match[1] })
    }
  }
  for (const { page, reference } of references) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) continue
    const url = new URL(reference, `https://site.invalid/${relative(root, page).split(sep).join("/")}`)
    let target = resolve(root, `.${decodeURIComponent(url.pathname)}`)
    if (!target.startsWith(`${root}${sep}`) && target !== root) {
      throw new Error(`Link escapes website: ${reference}`)
    }
    if (url.pathname.endsWith("/")) target = resolve(target, "index.html")
    try {
      await readFile(target)
    } catch (cause) {
      throw new Error(`Missing local target in ${relative(root, page)}: ${reference}`, { cause })
    }
    if (url.hash && !ids.get(target)?.has(decodeURIComponent(url.hash.slice(1)))) {
      throw new Error(`Missing anchor in ${relative(root, page)}: ${reference}`)
    }
  }
  await mkdir(output, { recursive: true })
  await cp(root, output, { recursive: true })
  await writeFile(resolve(output, ".nojekyll"), "")
  console.log(`Built ${pages.length} pages; validated ${references.length} references → ${output}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSite()
}
