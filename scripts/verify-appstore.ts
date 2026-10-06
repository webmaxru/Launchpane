import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const METADATA = join(ROOT, "appstore", "metadata", "en-US")

function text(name: string): string {
  return readFileSync(join(METADATA, name), "utf8").trim()
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function imageProperty(path: string, property: string): string {
  const output = execFileSync("/usr/bin/sips", ["-g", property, path], { encoding: "utf8" })
  return output.trim().split(/\s+/).at(-1) ?? ""
}

function main(): void {
  const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string }
  const tauri = JSON.parse(readFileSync(join(ROOT, "src-tauri", "tauri.conf.json"), "utf8")) as {
    version: string
    identifier: string
  }
  const cargoVersion =
    readFileSync(join(ROOT, "src-tauri", "Cargo.toml"), "utf8").match(/^version = "([^"]+)"/m)?.[1]

  assert(packageJson.version === tauri.version, "package.json and tauri.conf.json versions differ")
  assert(packageJson.version === cargoVersion, "package.json and Cargo.toml versions differ")
  assert(tauri.identifier === "com.webmaxru.launchpane", "Unexpected bundle identifier")

  assert(text("name.txt").length <= 30, "App name exceeds 30 characters")
  assert(text("subtitle.txt").length <= 30, "Subtitle exceeds 30 characters")
  assert(Buffer.byteLength(text("keywords.txt"), "utf8") <= 100, "Keywords exceed 100 bytes")
  assert(text("promotional-text.txt").length <= 170, "Promotional text exceeds 170 characters")
  assert(text("description.txt").length <= 4000, "Description exceeds 4000 characters")
  assert(text("privacy-policy-url.txt").includes("/privacy/"), "Privacy URL is not the privacy policy")

  for (const name of ["overview.png", "detail.png", "login-items.png", "logs.png"]) {
    const path = join(ROOT, "branding", "store", "screenshots", "2880x1800", name)
    assert(imageProperty(path, "pixelWidth") === "2880", `${name} width is not 2880`)
    assert(imageProperty(path, "pixelHeight") === "1800", `${name} height is not 1800`)
    assert(imageProperty(path, "hasAlpha") === "no", `${name} contains an alpha channel`)
  }

  const icon = join(ROOT, "branding", "store", "appstore-icon-1024.png")
  assert(imageProperty(icon, "pixelWidth") === "1024", "Marketing icon width is not 1024")
  assert(imageProperty(icon, "pixelHeight") === "1024", "Marketing icon height is not 1024")
  assert(imageProperty(icon, "hasAlpha") === "no", "Marketing icon contains an alpha channel")

  console.log(`App Store assets verified for Launchpane ${packageJson.version}`)
}

main()
