import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchBar } from "./SearchBar"

describe("SearchBar", () => {
  it("groups source choices in a descriptive menu", async () => {
    const user = userEvent.setup()
    const onSourceFilterChange = vi.fn()

    render(
      <SearchBar
        search=""
        onSearchChange={vi.fn()}
        sourceFilter="All"
        onSourceFilterChange={onSourceFilterChange}
      />
    )

    await user.click(
      screen.getByRole("button", { name: "Source filter: All services" })
    )

    expect(
      screen.getByRole("menuitemradio", { name: /My agents/ })
    ).toHaveTextContent("Automations you created in your LaunchAgents folder")
    expect(
      screen.getByRole("menuitemradio", { name: /Login items/ })
    ).toHaveTextContent("Helpers registered by installed applications")

    await user.click(screen.getByRole("menuitemradio", { name: /Login items/ }))
    expect(onSourceFilterChange).toHaveBeenCalledWith("LoginItem")
  })

  it("shows and clears active filters", async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onSourceFilterChange = vi.fn()

    render(
      <SearchBar
        search="backup"
        onSearchChange={onSearchChange}
        sourceFilter="Home"
        onSourceFilterChange={onSourceFilterChange}
      />
    )

    expect(
      screen.getByRole("button", { name: "Source filter: My agents" })
    ).toBeInTheDocument()
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "aria-keyshortcuts",
      "/"
    )

    await user.click(screen.getByRole("button", { name: "Clear all filters" }))

    expect(onSearchChange).toHaveBeenCalledWith("")
    expect(onSourceFilterChange).toHaveBeenCalledWith("All")
  })
})
