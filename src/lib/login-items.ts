import type { JobSource } from "@/types"

const LOGIN_ITEMS_FRAGMENT = "/Contents/Library/LoginItems/"

export function isLoginItem(source: JobSource): boolean {
  return source === "LoginItem"
}

/** Name of the application that ships a login item helper, derived from its bundle path. */
export function parentAppName(bundlePath: string): string | null {
  const index = bundlePath.indexOf(LOGIN_ITEMS_FRAGMENT)
  if (index === -1) return null
  const parent = bundlePath.slice(0, index)
  const name = parent.split("/").pop()
  if (!name) return null
  return name.replace(/\.app$/, "")
}
