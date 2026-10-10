import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import App from "@/App"
import {
  resetFakeHandlers,
  setFakeHandler,
} from "@/test-utils/tauri-mock"
import type { JobListEntry } from "@/types"

async function confirmAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("button", { name }))
}

async function chooseRowAction(
  user: ReturnType<typeof userEvent.setup>,
  jobLabel: string,
  action: string
) {
  await user.click(
    await screen.findByRole("button", { name: `Actions for ${jobLabel}` })
  )
  await user.click(
    screen.getByRole("menuitem", {
      name: action === "Remove" ? "Remove agent…" : action,
    })
  )
}

beforeEach(() => {
  resetFakeHandlers()
  localStorage.clear()
  document.documentElement.classList.remove("dark")
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("App action feedback", () => {
  it("shows success feedback after disabling a job", async () => {
    setFakeHandler("disable_job", () => false)
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(user, "com.example.running-agent", "Disable")
    await confirmAction(user, "Disable")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "com.example.running-agent is now disabled."
    )
    expect(screen.getByTestId("feedback-region")).toHaveClass("fixed")
  })

  describe("App Review walkthrough", () => {
    it("completes through inventory refreshes and removes the temporary agent", async () => {
      const demoPath =
        "/Users/test/Library/LaunchAgents/com.launchpane.review.demo.plist"
      let jobs: JobListEntry[] = [
        {
          label: "com.apple.system-agent",
          pid: 5678,
          last_exit_code: 0,
          plist_path: "/Library/LaunchAgents/com.apple.system-agent.plist",
          source: "SystemAgent" as const,
          status: "Running" as const,
          enabled: true,
          last_run_at: String(Date.now()),
          is_home_agent: false,
        },
      ]
      setFakeHandler("get_runtime_info", () => ({
        is_administrator: false,
        can_restart_as_administrator: true,
        review_demo: true,
      }))
      setFakeHandler("list_jobs", () => [...jobs])
      setFakeHandler("create_job", ({ label }) => {
        jobs = [
          ...jobs,
          {
            label: String(label),
            pid: null,
            last_exit_code: null,
            plist_path: demoPath,
            source: "UserAgent" as const,
            status: "Unloaded" as const,
            enabled: true,
            last_run_at: null,
            is_home_agent: true,
          },
        ]
        return demoPath
      })
      setFakeHandler("delete_job", ({ plistPath }) => {
        jobs = jobs.filter((job) => job.plist_path !== plistPath)
      })

      vi.useFakeTimers()
      render(<App />)
      const advance = async (milliseconds: number) => {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(milliseconds)
        })
      }

      await advance(150)
      await advance(5000)
      expect(
        screen.getByPlaceholderText("Search by label (/)")
      ).toHaveValue("com.apple.system-agent")
      await advance(4000)
      await advance(4000)
      await advance(5000)
      expect(screen.getByRole("dialog")).toBeVisible()
      await advance(6000)
      expect(jobs.some((job) => job.label === "com.launchpane.review.demo")).toBe(
        true
      )
      await advance(4000)
      await advance(6000)
      expect(screen.getByRole("dialog")).toHaveTextContent("Remove agent")
      expect(screen.getByRole("dialog")).toHaveTextContent(
        "com.launchpane.review.demo"
      )
      await advance(4000)
      expect(jobs.some((job) => job.label === "com.launchpane.review.demo")).toBe(
        false
      )
      expect(screen.getByRole("status")).toHaveTextContent(
        "com.launchpane.review.demo removed successfully."
      )
    }, 20000)
  })

  it("shows failure feedback when enabling a job fails", async () => {
    setFakeHandler("enable_job", () => {
      throw new Error("Permission denied")
    })
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(user, "com.example.stopped-agent", "Enable")
    await confirmAction(user, "Enable")

    await waitFor(() => {
      const alert = screen.getByRole("alert")
      expect(alert).toHaveTextContent(
        "Couldn’t enable com.example.stopped-agent."
      )
      expect(alert).toHaveTextContent("Permission denied")
    })
  })

  it("shows and clears in-progress feedback while a toggle is pending", async () => {
    let resolveDisable: (enabled: boolean) => void = () => {}
    setFakeHandler(
      "disable_job",
      () =>
        new Promise<boolean>((resolve) => {
          resolveDisable = resolve
        })
    )
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(user, "com.example.running-agent", "Disable")
    await confirmAction(user, "Disable")

    expect(screen.getByRole("status")).toHaveTextContent(
      "Disabling com.example.running-agent…"
    )

    resolveDisable(false)

    await waitFor(() => {
      expect(
        screen.queryByText("Disabling com.example.running-agent…")
      ).not.toBeInTheDocument()
    })
    expect(await screen.findByRole("status")).toHaveTextContent(
      "com.example.running-agent is now disabled."
    )
  })

  it("does not let a stale success timer dismiss newer loading feedback", async () => {
    let resolveStop: () => void = () => {}
    setFakeHandler(
      "stop_job",
      () =>
        new Promise<void>((resolve) => {
          resolveStop = resolve
        })
    )
    render(<App />)

    const adminButton = await screen.findByRole("button", {
      name: "Open Administrator Window",
    })
    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(adminButton)
      await Promise.resolve()
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      "Administrator window opened."
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    fireEvent.click(screen.getByRole("button", { name: "Stop" }))
    expect(screen.getByRole("status")).toHaveTextContent(
      "Unloading com.example.running-agent…"
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      "Unloading com.example.running-agent…"
    )

    await act(async () => {
      resolveStop()
      for (let index = 0; index < 5; index += 1) {
        await Promise.resolve()
      }
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      "com.example.running-agent unloaded successfully."
    )

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByTestId("action-feedback")).not.toBeInTheDocument()
  })

  it("keeps failure feedback until the user dismisses it", async () => {
    setFakeHandler("stop_job", () => {
      throw new Error("Permission denied")
    })
    render(<App />)

    const stopButton = await screen.findByRole("button", { name: "Stop" })
    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(stopButton)
      await Promise.resolve()
    })
    expect(screen.getByRole("alert")).toHaveTextContent("Permission denied")

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByTestId("action-feedback")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Dismiss error" }))
    expect(screen.queryByTestId("action-feedback")).not.toBeInTheDocument()
  })

  it("keeps success feedback when refresh fails after disabling succeeds", async () => {
    let listCalls = 0
    setFakeHandler("list_jobs", () => {
      listCalls += 1
      if (listCalls > 1) {
        throw new Error("Refresh failed")
      }
      return [
        {
          label: "com.example.running-agent",
          pid: 1234,
          last_exit_code: 0,
          plist_path:
            "/Users/test/Library/LaunchAgents/com.example.running-agent.plist",
          source: "UserAgent",
          status: "Running",
          enabled: true,
          last_run_at: String(Date.now()),
          is_home_agent: true,
        },
      ]
    })
    setFakeHandler("disable_job", () => false)
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(user, "com.example.running-agent", "Disable")
    await confirmAction(user, "Disable")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "com.example.running-agent is now disabled."
    )
    expect(
      await screen.findByText("Couldn’t load background services")
    ).toBeInTheDocument()
    expect(screen.getByText("Refresh failed")).toBeInTheDocument()
  })

  it("shows failure feedback when verified enable state does not match", async () => {
    setFakeHandler("enable_job", () => false)
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(user, "com.example.stopped-agent", "Enable")
    await confirmAction(user, "Enable")

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Couldn’t enable com.example.stopped-agent. launchd reported disabled, not enabled."
      )
    })
  })

  it("shows feedback after starting administrator mode", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: "Open Administrator Window" })
    )

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Administrator window opened."
    )
  })
})

describe("App appearance", () => {
  it("offers explicit System, Light, and Dark theme choices", async () => {
    const user = userEvent.setup()
    render(<App />)

    const appearance = screen.getByRole("button", {
      name: "Appearance: system",
    })
    await user.click(appearance)

    expect(
      screen.getByRole("menuitemradio", { name: "System" })
    ).toHaveAttribute("data-state", "checked")
    expect(screen.getByRole("menuitemradio", { name: "Light" })).toBeVisible()
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toBeVisible()

    await user.click(screen.getByRole("menuitemradio", { name: "Dark" }))

    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem("launchpane-theme")).toBe("dark")
    expect(
      screen.getByRole("button", { name: "Appearance: dark" })
    ).toBeInTheDocument()
  })
})

describe("App workspace navigation", () => {
  it("focuses search and opens creation from keyboard shortcuts", async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText("com.example.running-agent")
    await user.keyboard("/")
    expect(screen.getByRole("searchbox")).toHaveFocus()

    await user.keyboard("{Escape}")
    screen.getByRole("searchbox").blur()
    await user.keyboard("n")
    expect(
      await screen.findByRole("heading", { name: "New Agent" })
    ).toBeInTheDocument()
  })

  it("shows a truthful persistent recovery state when inventory loading fails", async () => {
    setFakeHandler("list_jobs", () => {
      throw new Error("launchctl unavailable")
    })
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText("Services unavailable")).toBeInTheDocument()
    expect(
      screen.getByText("Couldn’t load background services")
    ).toBeInTheDocument()
    expect(
      screen.queryByText("No background services found")
    ).not.toBeInTheDocument()

    await user.click(screen.getByText("Technical details"))
    expect(screen.getByText("launchctl unavailable")).toBeVisible()
  })
})

describe("App action confirmation", () => {
  it.each([
    ["enable", "Enable", "enable_job", "Enable agent"],
    ["disable", "Disable", "disable_job", "Disable agent"],
    ["delete", "Remove", "delete_job", "Remove agent"],
  ])(
    "asks for confirmation before %s and only runs it once confirmed",
    async (_kind, buttonName, command, dialogTitle) => {
      const handler = vi.fn(() => (command === "disable_job" ? false : true))
      setFakeHandler(command, handler)
      const user = userEvent.setup()
      render(<App />)

      await chooseRowAction(
        user,
        buttonName === "Enable"
          ? "com.example.stopped-agent"
          : "com.example.running-agent",
        buttonName
      )

      const dialog = await screen.findByRole("dialog")
      expect(
        within(dialog).getByRole("heading", { name: dialogTitle })
      ).toBeInTheDocument()
      expect(handler).not.toHaveBeenCalled()

      await user.click(within(dialog).getByRole("button", { name: buttonName }))

      await waitFor(() => expect(handler).toHaveBeenCalledOnce())
    }
  )

  it.each([
    ["enable", "Enable", "enable_job"],
    ["disable", "Disable", "disable_job"],
    ["delete", "Remove", "delete_job"],
  ])("does not %s when the confirmation is cancelled", async (_kind, buttonName, command) => {
    const handler = vi.fn(() => true)
    setFakeHandler(command, handler)
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(
      user,
      buttonName === "Enable"
        ? "com.example.stopped-agent"
        : "com.example.running-agent",
      buttonName
    )

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it("names the agent in the confirmation dialog", async () => {
    const user = userEvent.setup()
    render(<App />)

    await chooseRowAction(user, "com.example.running-agent", "Disable")

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("com.example.running-agent")
  })
})

describe("App header branding", () => {
  it("renders the Launchpane brand mark next to the title", async () => {
    const { container } = render(<App />)
    const header = container.querySelector("header")
    expect(header).not.toBeNull()

    const mark = header!.querySelector("img")
    expect(mark).not.toBeNull()
    expect(mark!.getAttribute("src")).toContain("svg")

    await waitFor(() => {
      expect(within(header!).getByText("Launchpane")).toBeTruthy()
    })
  })
})
