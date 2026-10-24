export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Must match the message returned by the Store build when no folder has been chosen.
const FOLDER_ACCESS_REQUIRED_PREFIX = "Folder access is required."

export function isFolderAccessRequired(message: string | null | undefined): boolean {
  return message?.startsWith(FOLDER_ACCESS_REQUIRED_PREFIX) ?? false
}
