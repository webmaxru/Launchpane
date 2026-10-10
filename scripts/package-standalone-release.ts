import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const targets: Record<string, { name: string; architectures: string[] }> = {
  "aarch64-apple-darwin": { name: "aarch64", architectures: ["arm64"] },
  "x86_64-apple-darwin": { name: "x64", architectures: ["x86_64"] },
  "universal-apple-darwin": { name: "universal", architectures: ["arm64", "x86_64"] },
}
const target = process.argv[2]
const configuration = targets[target]
if (!configuration) throw new Error("Specify a supported standalone macOS target.")

const root = process.cwd()
const version = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version
const bundle = join(root, "src-tauri", "target", target, "release", "bundle")
const app = join(bundle, "macos", "Launchpane.app")
const binary = join(app, "Contents", "MacOS", "launchpane")
const architectures = execFileSync("/usr/bin/lipo", ["-archs", binary], { encoding: "utf8" }).trim().split(/\s+/).sort()
if (architectures.join(",") !== configuration.architectures.toSorted().join(",")) {
  throw new Error(`Unexpected architectures in ${target}: ${architectures.join(",")}`)
}
for (const field of ["CFBundleShortVersionString", "CFBundleVersion"]) {
  const actual = execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${field}`, join(app, "Contents", "Info.plist")],
    { encoding: "utf8" }).trim()
  if (actual !== version) throw new Error(`${field} does not match standalone version ${version}.`)
}
if (!existsSync(join(app, "Contents", "Resources", "LICENSE"))) {
  throw new Error("Standalone app is missing its license.")
}
const diskImage = `Launchpane_${version}_${configuration.name}.dmg`
execFileSync("/usr/bin/hdiutil", ["verify", join(bundle, "dmg", diskImage)], { stdio: "pipe" })
const output = join(root, "release", "github")
mkdirSync(output, { recursive: true })
copyFileSync(join(bundle, "dmg", diskImage), join(output, diskImage))
execFileSync("/usr/bin/tar", [
  "-czf", join(output, `Launchpane_${configuration.name}.app.tar.gz`),
  "-C", join(bundle, "macos"), "Launchpane.app",
], { env: { ...process.env, COPYFILE_DISABLE: "1" } })
console.log(`Packaged standalone ${version} for ${architectures.join(" + ")}.`)
