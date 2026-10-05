import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { useJobs } from "./useJobs"
import { resetFakeHandlers, setFakeHandler } from "@/test-utils/tauri-mock"

beforeEach(() => {
  resetFakeHandlers()
})

describe("useJobs", () => {
  it("loads jobs on mount", async () => {
    const { result } = renderHook(() => useJobs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.jobs.length).toBe(3)
    expect(result.current.error).toBeNull()
  })

  it("filters by search term", async () => {
    const { result } = renderHook(() => useJobs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setSearch("running")
    })

    await waitFor(() => {
      expect(result.current.filteredJobs.length).toBe(1)
      expect(result.current.filteredJobs[0].label).toBe(
        "com.example.running-agent"
      )
    })
  })

  it("filters by source", async () => {
    const { result } = renderHook(() => useJobs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setSourceFilter("SystemAgent")
    })

    await waitFor(() => {
      expect(result.current.filteredJobs.length).toBe(1)
      expect(result.current.filteredJobs[0].source).toBe("SystemAgent")
    })
  })

  it("filters by Home (user-authored agents)", async () => {
    const { result } = renderHook(() => useJobs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setSourceFilter("Home")
    })

    await waitFor(() => {
      expect(result.current.filteredJobs.length).toBe(1)
      expect(result.current.filteredJobs[0].label).toBe(
        "com.example.running-agent"
      )
      expect(result.current.filteredJobs[0].is_home_agent).toBe(true)
    })
  })

  it("handles error", async () => {
    setFakeHandler("list_jobs", () => {
      throw new Error("Connection failed")
    })

    const { result } = renderHook(() => useJobs())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toContain("Connection failed")
    expect(result.current.jobs.length).toBe(0)
  })
  it("filters login items into their own group", async () => {
    setFakeHandler("list_jobs", () => [
      {
        label: "com.example.agent",
        pid: null,
        last_exit_code: null,
        plist_path: "/Users/test/Library/LaunchAgents/com.example.agent.plist",
        source: "UserAgent",
        status: "Unloaded",
        enabled: true,
        last_run_at: null,
        is_home_agent: false,
      },
      {
        label: "com.coppertino.VOXAgent",
        pid: 575,
        last_exit_code: 0,
        plist_path: "/Applications/VOX.app/Contents/Library/LoginItems/VOXAgent.app",
        source: "LoginItem",
        status: "Running",
        enabled: true,
        last_run_at: null,
        is_home_agent: false,
      },
    ])

    const { result } = renderHook(() => useJobs())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSourceFilter("LoginItem")
    })

    await waitFor(() => {
      expect(result.current.filteredJobs.map((job) => job.label)).toEqual([
        "com.coppertino.VOXAgent",
      ])
    })
  })
})
