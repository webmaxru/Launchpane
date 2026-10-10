import type { JobListEntry } from "@/types"

export type RuntimeAction = "load" | "unload" | "run" | "restart" | "enable" | "disable"
export type ActionAvailability = { hidden: boolean; reason: string | null }

export const STORE_ADMIN_REASON =
  "Unavailable in the Mac App Store edition: administrator access is not supported."
export const STORE_SHARED_REASON =
  "Unavailable in the Mac App Store edition: shared agents and system daemons are read-only."
export const STORE_LOGIN_REASON =
  "Unavailable in the Mac App Store edition: login helpers support Enable and Disable only; their parent app manages their lifecycle."

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
    reason = "Wait for the current action to finish and its state to be verified."
  } else if (job.source === "SystemDaemon" && !isAdministrator) {
    reason = "Open Administrator Window to change a service in the system launchd domain."
  } else if (action === "enable" && job.enabled === true) {
    reason = "Already enabled. Enabling does not load or start a service."
  } else if (action === "disable" && job.enabled === false) {
    reason = "Already disabled. Disabling does not stop an already loaded service."
  } else if (["load", "unload", "run", "restart"].includes(action)) {
    if (job.status === "Unknown") {
      reason = "Refresh to verify whether this service is registered with launchd."
    } else if (action === "load") {
      reason = job.status !== "Unloaded"
        ? "Already loaded. Use Run now or Restart instead."
        : job.enabled === false
          ? "Enable this service before loading it."
          : job.enabled === null
            ? "Refresh or enable this service to verify its enabled state before loading."
            : null
    } else if (job.status === "Unloaded") {
      reason = job.source === "LoginItem"
        ? "The parent app must register this helper again before it can run, restart or unload."
        : "Load this service first. Enabling alone does not register it with launchd."
    } else if (action === "run" && job.status === "Running") {
      reason = "Already running. Use Restart to terminate and start a new instance."
    }
  }
  return { hidden: false, reason }
}
