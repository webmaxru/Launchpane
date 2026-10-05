import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import App from "@/App"
import {
  resetFakeHandlers,
  setFakeHandler,
} from "@/test-utils/tauri-mock"

async function confirmAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("button", { name }))
}

function confirmActionSync(name: string) {
  const dialog = screen.getByRole("dialog")
  fireEvent.click(within(dialog).getByRole("button", { name }))
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

    const disableButtons = await screen.findAllByRole("button", {
      name: "Disable",
    })
    await user.click(disableButtons[0])
    await confirmAction(user, "Disable")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "com.example.running-agent is now disabled."
    )
    expect(screen.getByTestId("feedback-region")).toHaveClass("fixed")
  })

  it("shows failure feedback when enabling a job fails", async () => {
    setFakeHandler("enable_job", () => {
      throw new Error("Permission denied")
    })
    const user = userEvent.setup()
    render(<App />)

    const enableButtons = await screen.findAllByRole("button", {
      name: "Enable",
    })
    await user.click(enableButtons[0])
    await confirmAction(user, "Enable")

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to enable com.example.stopped-agent: Error: Permission denied"
      )
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

    const disableButtons = await screen.findAllByRole("button", {
      name: "Disable",
    })
    await user.click(disableButtons[0])
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
    let resolveDisable: (enabled: boolean) => void = () => {}
    setFakeHandler(
      "disable_job",
      () =>
        new Promise<boolean>((resolve) => {
          resolveDisable = resolve
        })
    )
    render(<App />)

    const adminButton = await screen.findByRole("button", {
      name: "Start as Administrator",
    })
    const disableButton = (await screen.findAllByRole("button", {
      name: "Disable",
    }))[0]
    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(adminButton)
      await Promise.resolve()
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      "Administrator window started."
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    fireEvent.click(disableButton)
    confirmActionSync("Disable")
    expect(screen.getByRole("status")).toHaveTextContent(
      "Disabling com.example.running-agent…"
    )

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      "Disabling com.example.running-agent…"
    )

    await act(async () => {
      resolveDisable(false)
      for (let index = 0; index < 5; index += 1) {
        await Promise.resolve()
      }
    })
    expect(screen.getByRole("status")).toHaveTextContent(
      "com.example.running-agent is now disabled."
    )

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByTestId("action-feedback")).not.toBeInTheDocument()
  })

  it("automatically dismisses failure feedback", async () => {
    setFakeHandler("enable_job", () => {
      throw new Error("Permission denied")
    })
    render(<App />)

    const enableButton = (await screen.findAllByRole("button", {
      name: "Enable",
    }))[0]
    vi.useFakeTimers()

    await act(async () => {
      fireEvent.click(enableButton)
      await Promise.resolve()
    })
    await act(async () => {
      confirmActionSync("Enable")
      await Promise.resolve()
    })
    expect(screen.getByRole("alert")).toHaveTextContent("Permission denied")

    act(() => {
      vi.advanceTimersByTime(4000)
    })
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

    await user.click(await screen.findByRole("button", { name: "Disable" }))
    await confirmAction(user, "Disable")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "com.example.running-agent is now disabled."
    )
    expect(
      await screen.findByText("Error: Refresh failed")
    ).toBeInTheDocument()
  })

  it("shows failure feedback when verified enable state does not match", async () => {
    setFakeHandler("enable_job", () => false)
    const user = userEvent.setup()
    render(<App />)

    const enableButtons = await screen.findAllByRole("button", {
      name: "Enable",
    })
    await user.click(enableButtons[0])
    await confirmAction(user, "Enable")

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to enable com.example.stopped-agent: verified state is disabled, expected enabled."
      )
    })
  })

  it("shows feedback after starting administrator mode", async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      await screen.findByRole("button", { name: "Start as Administrator" })
    )

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Administrator window started."
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

describe("App action confirmation", () => {
  it.each([
    ["enable", "Enable", "enable_job", "Enable Agent"],
    ["disable", "Disable", "disable_job", "Disable Agent"],
    ["delete", "Remove", "delete_job", "Remove Agent"],
  ])(
    "asks for confirmation before %s and only runs it once confirmed",
    async (_kind, buttonName, command, dialogTitle) => {
      const handler = vi.fn(() => (command === "disable_job" ? false : true))
      setFakeHandler(command, handler)
      const user = userEvent.setup()
      render(<App />)

      const rowButtons = await screen.findAllByRole("button", {
        name: buttonName,
      })
      await user.click(rowButtons[0])

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

    const rowButtons = await screen.findAllByRole("button", {
      name: buttonName,
    })
    await user.click(rowButtons[0])

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

    const disableButtons = await screen.findAllByRole("button", {
      name: "Disable",
    })
    await user.click(disableButtons[0])

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("com.example.running-agent")
  })
})
