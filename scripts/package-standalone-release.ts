import { execFileSync, spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const targets: Record<string, { name: string; architectures: string[] }> = {
  "aarch64-apple-darwin": { name: "aarch64", architectures: ["arm64"] },
  "x86_64-apple-darwin": { name: "x64", architectures: ["x86_64"] },
  "universal-apple-darwin": { name: "universal", architectures: ["arm64", "x86_64"] },
}
const target = process.argv[2]
const configuration = targets[target]
if (!configuration) throw new Error("Specify a supported standalone macOS target.")
const requireNotarization = process.argv.includes("--require-notarization")
if (process.argv.slice(3).some((argument) => argument !== "--require-notarization")) {
  throw new Error("Usage: node scripts/package-standalone-release.ts <target> [--require-notarization]")
}

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
const diskImagePath = join(bundle, "dmg", diskImage)
execFileSync("/usr/bin/hdiutil", ["verify", diskImagePath], { stdio: "pipe" })
function verifyDistribution(appPath: string, imagePath: string): void {
  const signature = spawnSync("/usr/bin/codesign", ["--display", "--verbose=4", appPath], { encoding: "utf8" })
  if (signature.status !== 0) throw new Error("Could not inspect the release app's code signature.")
  const signingDetails = `${signature.stdout}\n${signature.stderr}`
  const expectedIdentity = process.env.APPLE_SIGNING_IDENTITY
  if (!signingDetails.includes("Authority=Developer ID Application:")
      || !/TeamIdentifier=[A-Z0-9]+/.test(signingDetails)
      || !expectedIdentity
      || !signingDetails.includes(expectedIdentity)) {
    throw new Error("Release app is not signed by the configured Developer ID Application identity.")
  }
  execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath], { stdio: "pipe" })
  execFileSync("/usr/sbin/spctl", ["--assess", "--type", "execute", "--verbose=2", appPath], { stdio: "pipe" })
  execFileSync("/usr/bin/xcrun", ["stapler", "validate", appPath], { stdio: "pipe" })
  execFileSync("/usr/bin/xcrun", ["stapler", "validate", imagePath], { stdio: "pipe" })
  execFileSync("/usr/sbin/spctl", [
    "--assess", "--type", "open", "--context", "context:primary-signature", "--verbose=2", imagePath,
  ], { stdio: "pipe" })
}

if (requireNotarization) verifyDistribution(app, diskImagePath)
const output = join(root, "release", "github")
mkdirSync(output, { recursive: true })
copyFileSync(diskImagePath, join(output, diskImage))
const archive = join(output, `Launchpane_${configuration.name}.app.tar.gz`)
execFileSync("/usr/bin/tar", [
  "-czf", archive, "-C", join(bundle, "macos"), "Launchpane.app",
], { env: { ...process.env, COPYFILE_DISABLE: "1" } })
if (requireNotarization) {
  const verificationDirectory = mkdtempSync(join(tmpdir(), "launchpane-notarized-archive-"))
  try {
    execFileSync("/usr/bin/tar", ["-xzf", archive, "-C", verificationDirectory], { stdio: "pipe" })
    verifyDistribution(resolve(verificationDirectory, "Launchpane.app"), diskImagePath)
  } finally {
    rmSync(verificationDirectory, { recursive: true, force: true })
  }
}
console.log(`Packaged standalone ${version} for ${architectures.join(" + ")}.`)
