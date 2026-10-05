import { afterEach, describe, expect, it } from "vitest"
import { listJobs, normalizeEnabledState } from "./invoke"
import {
  resetFakeHandlers,
  setFakeHandler,
} from "@/test-utils/tauri-mock"

describe("normalizeEnabledState", () => {
  it.each([
    [true, true],
    [false, false],
    [null, null],
    [undefined, null],
    ["", null],
    [0, null],
  ])("normalizes %p to %p", (value, expected) => {
    expect(normalizeEnabledState(value)).toBe(expected)
  })
})

describe("listJobs", () => {
  afterEach(resetFakeHandlers)

  it("preserves unresolved backend enabled values as null", async () => {
    setFakeHandler("list_jobs", () => [
      {
        label: "com.example.unresolved",
        pid: null,
        last_exit_code: null,
        plist_path: "/tmp/com.example.unresolved.plist",
        source: "UserAgent",
        status: "Unloaded",
        last_run_at: null,
        is_home_agent: false,
      },
    ])

    await expect(listJobs()).resolves.toEqual([
      expect.objectContaining({ enabled: null }),
    ])
  })
})
