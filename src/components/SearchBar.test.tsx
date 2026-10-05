import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchBar } from "./SearchBar"

describe("SearchBar", () => {
  it("exposes a Login Items group in the source filter", async () => {
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

    const group = screen.getByRole("group", { name: "Filter agents by source" })
    expect(
      within(group).getAllByRole("button").map((button) => button.textContent)
    ).toEqual(["All", "User", "Home", "System", "Daemon", "Login Items"])

    await user.click(screen.getByRole("button", { name: "Login Items" }))
    expect(onSourceFilterChange).toHaveBeenCalledWith("LoginItem")
  })

  it("marks the active group as pressed", () => {
    render(
      <SearchBar
        search=""
        onSearchChange={vi.fn()}
        sourceFilter="LoginItem"
        onSourceFilterChange={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: "Login Items" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })
})
