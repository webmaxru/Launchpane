import { spawn } from "node:child_process"
import { existsSync, statSync, watch } from "node:fs"
import { homedir } from "node:os"
import { resolve } from "node:path"

/**
 * Rebuilds the macOS .app bundle whenever frontend or Rust sources change.
 *
 * Usage: node scripts/watch-app.ts [--debug] [--once]
 */

const release = !process.argv.includes("--debug")
const once = process.argv.includes("--once")
const profile = release ? "release" : "debug"

const root = resolve(import.meta.dirname, "..")
const appPath = resolve(
  root,
  "src-tauri/target",
  profile,
  "bundle/macos/Launchpane.app"
)

const watchTargets = [
  "src",
  "src-tauri/src",
  "src-tauri/capabilities",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "index.html",
  "vite.config.ts",
  "tsconfig.json",
].filter((entry) => existsSync(resolve(root, entry)))

const ignored = /(^|\/)(node_modules|target|dist|\.git)(\/|$)|\.(test|spec)\.[jt]sx?$|~$/

const DEBOUNCE_MS = 400

let building = false
let queued = false
let debounce: NodeJS.Timeout | undefined

function log(message: string) {
  const time = new Date().toLocaleTimeString()
  console.log(`[watch-app ${time}] ${message}`)
}

function build() {
  if (building) {
    queued = true
    return
  }
  building = true

  log(`Building ${profile} .app bundle…`)
  const child = spawn(
    "pnpm",
    ["exec", "tauri", "build", ...(release ? [] : ["--debug"]), "--bundles", "app"],
    {
      cwd: root,
      stdio: "inherit",
      env: { RUSTUP_HOME: resolve(homedir(), ".rustup"), ...process.env },
    }
  )

  child.on("exit", (code) => {
    building = false
    if (code === 0) {
      log(`Ready: ${appPath}`)
      log(`Launch it with: open "${appPath}"`)
    } else {
      log(`Build failed (exit code ${code}). Waiting for the next change…`)
    }

    if (once) {
      process.exit(code ?? 1)
    }
    if (queued) {
      queued = false
      build()
    }
  })
}

function scheduleBuild(reason: string) {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    log(`Change detected in ${reason}`)
    build()
  }, DEBOUNCE_MS)
}

if (!once) {
  for (const target of watchTargets) {
    const absolute = resolve(root, target)
    const recursive = statSync(absolute).isDirectory()
    watch(absolute, { recursive }, (_event, filename) => {
      const changed = filename ? `${target}/${filename}` : target
      if (ignored.test(changed)) return
      scheduleBuild(changed)
    })
  }

  log(`Watching: ${watchTargets.join(", ")}`)
  process.on("SIGINT", () => {
    log("Stopped.")
    process.exit(0)
  })
}

build()
