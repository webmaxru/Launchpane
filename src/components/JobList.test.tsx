import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { JobList } from "./JobList"
import type { JobListEntry } from "@/types"

const mockJobs: JobListEntry[] = [
  {
    label: "com.example.running",
    pid: 1234,
    last_exit_code: 0,
    plist_path: "/Users/test/Library/LaunchAgents/com.example.running.plist",
    source: "UserAgent",
    status: "Running",
    enabled: true,
    last_run_at: "200",
    is_home_agent: true,
  },
  {
    label: "com.example.stopped",
    pid: null,
    last_exit_code: 78,
    plist_path: "/Users/test/Library/LaunchAgents/com.example.stopped.plist",
    source: "UserAgent",
    status: "Unloaded",
    enabled: false,
    last_run_at: null,
    is_home_agent: false,
  },
]

const loginItemJob: JobListEntry = {
  label: "com.spotify.client.startuphelper",
  pid: null,
  last_exit_code: 0,
  plist_path:
    "/Applications/Spotify.app/Contents/Library/LoginItems/StartUpHelper.app",
  source: "LoginItem",
  status: "Loaded",
  enabled: true,
  last_run_at: null,
  is_home_agent: false,
}

const noop = vi.fn()

function renderJobList(
  jobs: JobListEntry[],
  props: Partial<ComponentProps<typeof JobList>> = {}
) {
  return render(
    <JobList
      jobs={jobs}
      loading={false}
      onStart={noop}
      onStop={noop}
      onRestart={noop}
      onKickstart={noop}
      onEnable={noop}
      onDisable={noop}
      onDelete={noop}
      onSelect={noop}
      onRevealInFinder={noop}
      {...props}
    />
  )
}

async function openActions(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("button", { name: `Actions for ${label}` }))
  return screen.getByRole("menu")
}

describe("JobList", () => {
  it.each(["SystemAgent", "SystemDaemon"] as const)(
    "keeps every %s runtime action visible with a Store-specific explanation",
    async (source) => {
      const user = userEvent.setup()
      const job = { ...mockJobs[0], source }
      renderJobList([job], { isAppStore: true, isAdministrator: true })
      const stop = screen.getByRole("button", { name: "Stop" })
      expect(stop).toBeDisabled()
      expect(stop).toHaveAttribute("title", expect.stringContaining("Mac App Store edition"))
      const menu = await openActions(user, job.label)
      for (const name of ["Load", "Run now", "Unload", "Restart", "Enable", "Disable"]) {
        const item = within(menu).getByRole("menuitem", { name })
        expect(item).toHaveAttribute("aria-disabled", "true")
        expect(item).toHaveTextContent("Mac App Store edition")
        expect(item).not.toHaveTextContent("Open Administrator Window")
      }
    }
  )

  it("disables login-helper lifecycle controls in Store without disabling eligible toggles", async () => {
    const user = userEvent.setup()
    renderJobList([loginItemJob], { isAppStore: true })
    expect(screen.getByRole("button", { name: "Run now" })).toBeDisabled()
    const menu = await openActions(user, loginItemJob.label)
    expect(within(menu).queryByRole("menuitem", { name: "Load" })).not.toBeInTheDocument()
    for (const name of ["Run now", "Unload", "Restart"]) {
      expect(within(menu).getByRole("menuitem", { name })).toHaveAttribute("aria-disabled", "true")
      expect(within(menu).getByRole("menuitem", { name })).toHaveTextContent("Mac App Store edition")
    }
    expect(within(menu).getByRole("menuitem", { name: "Disable" })).not.toHaveAttribute("aria-disabled")
  })

  it("renders loading state before the first result", () => {
    renderJobList([], { loading: true })

    expect(screen.getByText("Loading background services…")).toBeInTheDocument()
    expect(screen.getByTestId("enabled-badge")).toHaveTextContent("Loading…")
  })

  it("renders one persistent failure state with retry and technical details", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderJobList([], {
      error: "Permission denied by launchctl",
      onRetry,
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn’t load background services"
    )
    expect(
      screen.queryByText("No background services found")
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledOnce()

    await user.click(screen.getByText("Technical details"))
    expect(screen.getByText("Permission denied by launchctl")).toBeVisible()
  })

  it("puts recovery actions in the empty state", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const onCreate = vi.fn()
    renderJobList([], { onRetry, onCreate })

    await user.click(screen.getByRole("button", { name: "Refresh" }))
    await user.click(screen.getByRole("button", { name: "New Agent" }))

    expect(onRetry).toHaveBeenCalledOnce()
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it("offers one clear action when filters produce no matches", async () => {
    const user = userEvent.setup()
    const onClearFilters = vi.fn()
    renderJobList([], {
      hasActiveFilters: true,
      emptyTitle: "No services match your filters",
      onClearFilters,
    })

    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(onClearFilters).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole("button", { name: "New Agent" })
    ).not.toBeInTheDocument()
  })

  it("explains the relationship between enabled, loaded, and running", () => {
    renderJobList(mockJobs)

    const guide = screen.getByLabelText("How service state works")
    expect(guide).toHaveTextContent("Enabled may load at login or on schedule")
    expect(guide).toHaveTextContent("Loaded is registered with launchd")
    expect(guide).toHaveTextContent("Running has an active process now")
  })

  it("sorts rows from sortable column headers", async () => {
    const user = userEvent.setup()
    renderJobList(mockJobs)

    const labels = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).queryByText(/com\.example\./)?.textContent)

    expect(labels()).toEqual(["com.example.running", "com.example.stopped"])
    await user.click(screen.getByRole("button", { name: /Label/ }))
    expect(labels()).toEqual(["com.example.stopped", "com.example.running"])
  })

  it("opens details from the row with pointer or keyboard", () => {
    const onSelect = vi.fn()
    renderJobList([mockJobs[0]], { onSelect })

    const row = screen.getByRole("row", {
      name: `View details for ${mockJobs[0].label}`,
    })
    fireEvent.click(row)
    fireEvent.keyDown(row, { key: "Enter" })

    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(mockJobs[0])
  })

  it("shows only one context-aware runtime action per user agent", () => {
    renderJobList(mockJobs)

    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Restart" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument()
  })

  it("runs the context-aware primary action without opening details", async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    const onSelect = vi.fn()
    renderJobList([mockJobs[0]], { onStop, onSelect })

    await user.click(screen.getByRole("button", { name: "Stop" }))

    expect(onStop).toHaveBeenCalledWith(mockJobs[0])
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("moves secondary and destructive actions into an overflow menu", async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    const onKickstart = vi.fn()
    const onDisable = vi.fn()
    const onRevealInFinder = vi.fn()
    const onDelete = vi.fn()
    renderJobList([mockJobs[0]], {
      onRestart,
      onKickstart,
      onDisable,
      onRevealInFinder,
      onDelete,
    })

    let menu = await openActions(user, mockJobs[0].label)
    expect(within(menu).getByRole("menuitem", { name: "Restart" })).toBeVisible()
    expect(within(menu).getByRole("menuitem", { name: "Run now" })).toBeVisible()
    expect(within(menu).getByRole("menuitem", { name: "Disable" })).toBeVisible()
    expect(
      within(menu).getByRole("menuitem", { name: "Remove agent…" })
    ).toBeVisible()

    await user.click(within(menu).getByRole("menuitem", { name: "Restart" }))
    expect(onRestart).toHaveBeenCalledWith(mockJobs[0])

    menu = await openActions(user, mockJobs[0].label)
    await user.click(
      within(menu).getByRole("menuitem", { name: "Reveal in Finder" })
    )
    expect(onRevealInFinder).toHaveBeenCalledWith(mockJobs[0])

    menu = await openActions(user, mockJobs[0].label)
    await user.click(
      within(menu).getByRole("menuitem", { name: "Remove agent…" })
    )
    expect(onDelete).toHaveBeenCalledWith(mockJobs[0])
  })

  it("shows pending state without adding focusable disabled tooltip wrappers", () => {
    renderJobList([mockJobs[0]], {
      pendingAction: {
        plistPath: mockJobs[0].plist_path,
        kind: "disable",
      },
    })

    expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: `Actions for ${mockJobs[0].label}` })
    ).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument()
    expect(screen.queryByRole("row", {
      name: `View details for ${mockJobs[0].label}`,
    })).not.toHaveAttribute("tabindex", "0")
  })

  it("shows daemon actions disabled with a reason until administrator mode", async () => {
    const user = userEvent.setup()
    const onDisable = vi.fn()
    const systemJob: JobListEntry = {
      ...mockJobs[0],
      label: "com.example.daemon",
      plist_path: "/Library/LaunchDaemons/com.example.daemon.plist",
      source: "SystemDaemon",
    }
    const props = { onDisable }
    const { rerender } = renderJobList([systemJob], props)

    let menu = await openActions(user, systemJob.label)
    expect(within(menu).getByRole("menuitem", { name: "Disable" })).toHaveAttribute("aria-disabled", "true")
    expect(within(menu).getByRole("menuitem", { name: "Disable" })).toHaveTextContent("Open Administrator Window")
    await user.keyboard("{Escape}")

    rerender(
      <JobList
        jobs={[systemJob]}
        loading={false}
        isAdministrator
        onStart={noop}
        onStop={noop}
        onRestart={noop}
        onKickstart={noop}
        onEnable={noop}
        onDisable={onDisable}
        onDelete={noop}
        onSelect={noop}
        onRevealInFinder={noop}
      />
    )
    menu = await openActions(user, systemJob.label)
    await user.click(within(menu).getByRole("menuitem", { name: "Disable" }))
    expect(onDisable).toHaveBeenCalledWith(systemJob)
  })

  it("constrains expanded action hints to the space available inside the native window", async () => {
    const user = userEvent.setup()
    renderJobList([mockJobs[1]])
    const viewport = vi.spyOn(document.documentElement, "clientHeight", "get")
      .mockReturnValue(700)
    const trigger = screen.getByRole("button", { name: `Actions for ${mockJobs[1].label}` })
    const bounds = vi.spyOn(trigger, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(880, 400, 32, 32))
    try {
      const menu = await openActions(user, mockJobs[1].label)
      expect(menu).toHaveClass("overflow-y-auto")
      expect(menu).toHaveStyle({ maxHeight: "388px" })
    } finally {
      bounds.mockRestore()
      viewport.mockRestore()
    }
  })

  it("keeps login item actions plist-free and non-destructive", async () => {
    const user = userEvent.setup()
    const onDisable = vi.fn()
    renderJobList([loginItemJob], { onDisable })

    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument()
    const menu = await openActions(user, loginItemJob.label)
    expect(within(menu).getByRole("menuitem", { name: "Disable" })).toBeVisible()
    expect(within(menu).getByRole("menuitem", { name: "Run now" })).not.toHaveAttribute("aria-disabled")
    expect(within(menu).getByRole("menuitem", { name: "Unload" })).not.toHaveAttribute("aria-disabled")
    expect(within(menu).queryByRole("menuitem", { name: "Load" })).not.toBeInTheDocument()
    expect(
      within(menu).queryByRole("menuitem", { name: /Remove/ })
    ).not.toBeInTheDocument()
  })

  it("explains why disabled, unloaded agents cannot load, run or restart", async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    renderJobList([mockJobs[1]], { onStart })
    expect(screen.getByRole("button", { name: "Load" })).toBeDisabled()
    const menu = await openActions(user, mockJobs[1].label)
    expect(within(menu).getByRole("menuitem", { name: "Load" })).toHaveTextContent("Enable this service")
    expect(within(menu).getByRole("menuitem", { name: "Restart" })).toHaveTextContent("Load this service first")
    expect(within(menu).getByRole("menuitem", { name: "Disable" })).toHaveTextContent("Already disabled")
    expect(within(menu).getByRole("menuitem", { name: "Enable" })).not.toHaveAttribute("aria-disabled")
    expect(onStart).not.toHaveBeenCalled()
  })

  it("allows Library agent controls without administrator mode", async () => {
    const user = userEvent.setup()
    renderJobList([{ ...mockJobs[0], source: "SystemAgent" }])
    expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled()
    const menu = await openActions(user, mockJobs[0].label)
    for (const action of ["Restart", "Unload", "Disable"]) {
      expect(within(menu).getByRole("menuitem", { name: action })).not.toHaveAttribute("aria-disabled")
    }
    expect(within(menu).getByRole("menuitem", { name: "Run now" })).toHaveTextContent("Already running")
    expect(within(menu).queryByRole("menuitem", { name: "Remove agent…" })).not.toBeInTheDocument()
  })

  it("does not let keyboard activation of an action open the detail row", () => {
    const onSelect = vi.fn()
    renderJobList([mockJobs[0]], { onSelect })
    fireEvent.keyDown(screen.getByRole("button", { name: "Stop" }), { key: "Enter" })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("always displays explicit status and enabled state", () => {
    renderJobList([{ ...mockJobs[0], enabled: null, status: "Unknown" }])

    expect(screen.getAllByText("Unknown")).toHaveLength(2)
    expect(screen.getByTestId("enabled-badge")).toHaveTextContent("Unknown")
  })
})
