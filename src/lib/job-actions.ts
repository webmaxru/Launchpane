import type { JobListEntry } from "@/types"

export type RuntimeAction = "load" | "unload" | "run" | "restart" | "enable" | "disable"
export type ActionAvailability = { hidden: boolean; reason: string | null }

export const STORE_ADMIN_REASON =
  "Unavailable in the Mac App Store edition: administrator access is not supported."
export const STORE_SHARED_REASON =
  "Mac App Store edition: shared services are read-only."
export const STORE_LOGIN_REASON =
  "Mac App Store edition: Enable or Disable only; the parent app controls this helper."

export function actionAvailability(
  job: JobListEntry,
  action: RuntimeAction,
  isAdministrator: boolean,
  busy = false,
  isAppStore = false
): ActionAvailability {
  if (action === "load" && job.source === "LoginItem") {
    return {
      hidden: true,
      reason: "Only the parent app can register this helper; there is no standalone plist to load.",
    }
  }
  let reason: string | null = null
  if (isAppStore && (job.source === "SystemAgent" || job.source === "SystemDaemon")) {
    reason = STORE_SHARED_REASON
  } else if (isAppStore && job.source === "LoginItem" && action !== "enable" && action !== "disable") {
    reason = STORE_LOGIN_REASON
  } else if (busy) {
    reason = "Wait for the current action to finish and verify its state."
  } else if (job.source === "SystemDaemon" && !isAdministrator) {
    reason = "Open Administrator Window to control system daemons."
  } else if (action === "enable" && job.enabled === true) {
    reason = "Already enabled. This does not load or start it."
  } else if (action === "disable" && job.enabled === false) {
    reason = "Already disabled. A loaded service can still run."
  } else if (["load", "unload", "run", "restart"].includes(action)) {
    if (job.status === "Unknown") {
      reason = "Refresh to verify whether this service is registered with launchd."
    } else if (action === "load") {
      reason = job.status !== "Unloaded"
        ? "Already loaded. Use Run now or Restart instead."
        : job.enabled === false
          ? "Enable this service before loading it."
          : job.enabled === null
            ? "Refresh or enable to verify its state before loading."
            : null
    } else if (job.status === "Unloaded") {
      reason = job.source === "LoginItem"
        ? "Register this helper in its parent app first."
        : "Load this service first. Enable alone does not load it."
    } else if (action === "run" && job.status === "Running") {
      reason = "Already running. Use Restart for a new instance."
    }
  }
  return { hidden: false, reason }
}
