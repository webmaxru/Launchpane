import { describe, expect, it } from "vitest"
import { actionAvailability, STORE_CONTROL_REASON, type RuntimeAction } from "./job-actions"
import type { JobListEntry, JobSource, JobStatus } from "@/types"

const base: JobListEntry = {
  label: "test", plist_path: "/tmp/test.plist", source: "UserAgent",
  status: "Loaded", enabled: true, pid: null, last_exit_code: null,
  last_run_at: null, is_home_agent: false,
}
const actions: RuntimeAction[] = ["load", "run", "restart", "unload", "enable", "disable"]
const sources: JobSource[] = ["UserAgent", "SystemAgent", "SystemDaemon", "LoginItem"]
const statuses: JobStatus[] = ["Running", "Loaded", "Unloaded", "Unknown"]

describe("standalone action availability", () => {
  it("covers every source, status, enabled state and privilege combination", () => {
    for (const source of sources) {
      for (const status of statuses) {
        for (const enabled of [true, false, null]) {
          for (const admin of [true, false]) {
            for (const action of actions) {
              const job = { ...base, source, status, enabled }
              const state = actionAvailability(job, action, admin)
              expect(state.hidden).toBe(source === "LoginItem" && action === "load")
              if (state.hidden) continue
              const blocked = (source === "SystemDaemon" && !admin)
                || (action === "enable" && enabled === true)
                || (action === "disable" && enabled === false)
                || (["load", "run", "restart", "unload"].includes(action) && (
                  status === "Unknown"
                  || (action === "load" && (status !== "Unloaded" || enabled !== true))
                  || (action !== "load" && status === "Unloaded")
                  || (action === "run" && status === "Running")
                ))
              expect(state.reason !== null, `${source}/${status}/${enabled}/${admin}/${action}`).toBe(blocked)
            }
          }
        }
      }
    }
  })

  describe("Mac App Store action availability", () => {
    it("removes all service controls for every state, source and privilege", () => {
      for (const source of sources) {
        for (const status of statuses) {
          for (const enabled of [true, false, null]) {
            for (const admin of [true, false]) {
              for (const action of actions) {
                const job = { ...base, source, status, enabled }
                const state = actionAvailability(job, action, admin, false, true)
                expect(state).toEqual({ hidden: true, reason: STORE_CONTROL_REASON })
              }
            }
          }
        }
      }
    })
  })

  it("does not block runtime actions just because a loaded job is disabled", () => {
    for (const action of ["run", "restart", "unload"] as const) {
      expect(actionAvailability({ ...base, enabled: false }, action, false).reason).toBeNull()
    }
  })

  it("blocks all visible mutations during another operation", () => {
    for (const action of actions) {
      expect(actionAvailability(base, action, true, true).reason).toContain("Wait")
    }
  })
})
