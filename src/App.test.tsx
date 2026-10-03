import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "@/App"
import {
  resetFakeHandlers,
  setFakeHandler,
} from "@/test-utils/tauri-mock"

beforeEach(() => {
  resetFakeHandlers()
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe("App action feedback", () => {
  it("shows success feedback after disabling a job", async () => {
    const user = userEvent.setup()
    render(<App />)

    const disableButtons = await screen.findAllByRole("button", {
      name: "Disable",
    })
    await user.click(disableButtons[0])

    expect(await screen.findByRole("status")).toHaveTextContent(
      "com.example.running-agent disabled successfully."
    )
  })

  it("shows failure feedback when disabling a job fails", async () => {
    setFakeHandler("disable_job", () => {
      throw new Error("Permission denied")
    })
    const user = userEvent.setup()
    render(<App />)

    const disableButtons = await screen.findAllByRole("button", {
      name: "Disable",
    })
    await user.click(disableButtons[0])

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to disable com.example.running-agent: Error: Permission denied"
      )
    })
  })
})
