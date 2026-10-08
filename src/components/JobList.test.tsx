import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
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
    last_run_at: String(Date.now()),
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

describe("JobList", () => {
  it("renders loading state", () => {
    render(
      <JobList
        jobs={[]}
        loading={true}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
        onKickstart={noop}
        onEnable={noop}
        onDisable={noop}
        onDelete={noop}
        onSelect={noop}
        onRevealInFinder={noop}
      />
    )
    expect(screen.getByText("Loading background services…")).toBeInTheDocument()
    expect(screen.getByTestId("enabled-badge")).toHaveTextContent("Loading…")
    const loadingRow = screen.getByText("Loading background services…").closest("tr")
    expect(loadingRow?.querySelectorAll("td")).toHaveLength(1)
    expect(loadingRow?.querySelector("td")?.getAttribute("colspan")).toBe("7")
  })

  it("renders empty state", () => {
    render(
      <JobList
        jobs={[]}
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
      />
    )
    expect(screen.getByText("No background services found")).toBeInTheDocument()
    expect(
      screen.getByText("Refresh the list or create a user agent.")
    ).toBeInTheDocument()
  })

  it("renders job list with labels", () => {
    render(
      <JobList
        jobs={mockJobs}
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
      />
    )
    expect(screen.getByText("com.example.running")).toBeInTheDocument()
    expect(screen.getByText("com.example.stopped")).toBeInTheDocument()
  })

  it("renders status badges", () => {
    render(
      <JobList
        jobs={mockJobs}
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
      />
    )
    expect(screen.getByText("Running")).toBeInTheDocument()
    expect(screen.getByText("Unloaded")).toBeInTheDocument()
    expect(screen.getAllByText("Enabled")).toHaveLength(2)
    expect(screen.getByText("Disabled")).toBeInTheDocument()
  })

  it("renders PID for running job", () => {
    render(
      <JobList
        jobs={mockJobs}
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
      />
    )
    expect(screen.getByText("1234")).toBeInTheDocument()
  })

  it('shows "Run now" only for active (non-Unloaded) agents', () => {
    render(
      <JobList
        jobs={mockJobs}
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
      />
    )
    // mockJobs has one Running and one Unloaded agent → exactly one Run now button
    const runButtons = screen.getAllByRole("button", { name: "Run agent now" })
    expect(runButtons).toHaveLength(1)
  })

  it("calls onKickstart when Run now is clicked", () => {
    const onKickstart = vi.fn()
    render(
      <JobList
        jobs={mockJobs}
        loading={false}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
        onKickstart={onKickstart}
        onEnable={noop}
        onDisable={noop}
        onDelete={noop}
        onSelect={noop}
        onRevealInFinder={noop}
      />
    )
    screen.getByRole("button", { name: "Run agent now" }).click()
    expect(onKickstart).toHaveBeenCalledWith(
      expect.objectContaining({ label: "com.example.running" })
    )
  })

  it("renders only the action that can change the current enabled state", () => {
    render(
      <JobList
        jobs={mockJobs}
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
      />
    )

    expect(screen.getAllByRole("button", { name: "Enable" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Disable" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2)
  })

  it("calls the row action handlers from the explicit buttons", () => {
    const onEnable = vi.fn()
    const onDisable = vi.fn()
    const onDelete = vi.fn()
    render(
      <JobList
        jobs={mockJobs}
        loading={false}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
        onKickstart={noop}
        onEnable={onEnable}
        onDisable={onDisable}
        onDelete={onDelete}
        onSelect={noop}
        onRevealInFinder={noop}
      />
    )

    const enableButton = screen.getByRole("button", { name: "Enable" })
    const disableButton = screen.getByRole("button", { name: "Disable" })
    const removeButtons = screen.getAllByRole("button", { name: "Remove" })

    enableButton.click()
    disableButton.click()
    removeButtons[0].click()

    expect(onEnable).toHaveBeenCalledWith(mockJobs[1])
    expect(onDisable).toHaveBeenCalledWith(mockJobs[0])
    expect(onDelete).toHaveBeenCalledWith(mockJobs[0])
  })

  it("always displays an enabled-state badge", () => {
    render(
      <JobList
        jobs={[{ ...mockJobs[0], enabled: null }]}
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
      />
    )

    expect(screen.getByText("Unknown")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument()
  })

  it.each([
    ["true", true, "Enabled"],
    ["false", false, "Disabled"],
    ["null", null as unknown as boolean, "Unknown"],
    ["undefined", undefined as unknown as boolean, "Unknown"],
  ])("never renders an empty Enabled cell for enabled=%s", (_name, enabled, label) => {
    renderJobList([{ ...mockJobs[0], enabled }])

    const badge = screen.getByTestId("enabled-badge")
    const enabledCell = badge.closest("td")

    expect(enabledCell).not.toBeNull()
    expect(enabledCell?.textContent?.trim()).not.toBe("")
    expect(badge).toHaveTextContent(label)
  })

  it("renders Disabled as a passive neutral indicator, not an action control", () => {
    renderJobList([{ ...mockJobs[0], enabled: false }])

    const badge = screen.getByTestId("enabled-badge")

    expect(badge).toHaveAttribute("data-variant", "default")
    expect(badge).toHaveClass(
      "border-0",
      "bg-secondary",
      "text-secondary-foreground",
      "shadow-none"
    )
    expect(badge).not.toHaveClass("border-red-300")
  })

  it.each([
    ["true", true, "Disable"],
    ["false", false, "Enable"],
    ["null", null as unknown as boolean, "Enable"],
    ["undefined", undefined as unknown as boolean, "Enable"],
  ])("renders exactly one toggle button for enabled=%s", (_name, enabled, label) => {
    renderJobList([{ ...mockJobs[0], enabled }])

    const enableButtons = screen.queryAllByRole("button", { name: "Enable" })
    const disableButtons = screen.queryAllByRole("button", { name: "Disable" })

    expect(enableButtons).toHaveLength(label === "Enable" ? 1 : 0)
    expect(disableButtons).toHaveLength(label === "Disable" ? 1 : 0)
    expect(enableButtons.length + disableButtons.length).toBe(1)
  })

  it.each([
    ["enable", false, "Enable"],
    ["disable", true, "Disable"],
  ] as const)(
    "shows pending UI and disables the toggle button while %s is in flight",
    (kind, enabled, label) => {
      const job = { ...mockJobs[0], enabled }
      renderJobList([job], {
        pendingAction: { plistPath: job.plist_path, kind },
      })

      const toggleButton = screen.getByRole("button", { name: label })
      const enabledCell = screen.getByTestId("enabled-badge").closest("td")

      expect(toggleButton).toBeDisabled()
      expect(screen.getByTestId("toggle-spinner")).toBeInTheDocument()
      expect(screen.getByTestId("enabled-badge")).toHaveTextContent(
        kind === "enable" ? "Enabling…" : "Disabling…"
      )
      expect(enabledCell?.textContent?.trim()).not.toBe("")
    }
  )

  it("does not disable this row's buttons when another row has a pending action", () => {
    const job = mockJobs[0]
    renderJobList([job], {
      pendingAction: {
        plistPath: "/Users/test/Library/LaunchAgents/com.example.other.plist",
        kind: "disable",
      },
    })

    expect(screen.getByRole("button", { name: "Disable" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Stop agent" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled()
  })

  it("opens details immediately from the far-right action, not from the row", () => {
    const onSelect = vi.fn()
    const job = mockJobs[0]
    renderJobList([job], { onSelect })

    fireEvent.click(screen.getByText(job.label))
    expect(onSelect).not.toHaveBeenCalled()

    const detailsButton = screen.getByRole("button", {
      name: `View details for ${job.label}`,
    })
    expect(detailsButton.parentElement).toHaveClass("ml-auto")

    fireEvent.pointerDown(detailsButton, { button: 0 })
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(job)
  })

  it("retains keyboard activation for the direct details action", () => {
    const onSelect = vi.fn()
    const job = mockJobs[0]
    renderJobList([job], { onSelect })

    fireEvent.click(
      screen.getByRole("button", {
        name: `View details for ${job.label}`,
      }),
      { detail: 0 }
    )

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(job)
  })

  it("allows system toggles only in administrator mode", () => {
    const onDisable = vi.fn()
    const systemJob: JobListEntry = {
      ...mockJobs[0],
      label: "com.example.daemon",
      plist_path: "/Library/LaunchDaemons/com.example.daemon.plist",
      source: "SystemDaemon",
    }
    const props = {
      jobs: [systemJob],
      loading: false,
      onStart: noop,
      onStop: noop,
      onRestart: noop,
      onKickstart: noop,
      onEnable: noop,
      onDisable,
      onDelete: noop,
      onSelect: noop,
      onRevealInFinder: noop,
    }
    const { rerender } = render(
      <JobList {...props} isAdministrator={false} />
    )

    expect(screen.getByRole("button", { name: "Disable" })).toBeDisabled()

    rerender(<JobList {...props} isAdministrator={true} />)
    screen.getByRole("button", { name: "Disable" }).click()
    expect(onDisable).toHaveBeenCalledWith(systemJob)
  })

  it("keeps the toggle button aligned regardless of how many icon actions a row has", () => {
    renderJobList(mockJobs)

    const clusters = screen.getAllByTestId("row-icon-actions")
    expect(clusters).toHaveLength(2)

    // The Running row renders stop/restart/run-now, the Unloaded row only load.
    expect(clusters[0].querySelectorAll("button")).toHaveLength(3)
    expect(clusters[1].querySelectorAll("button")).toHaveLength(1)

    for (const cluster of clusters) {
      expect(cluster).toHaveClass("w-[5.5rem]", "shrink-0", "justify-start")
    }

    for (const label of ["Disable", "Enable"]) {
      expect(screen.getByRole("button", { name: label })).toHaveClass(
        "h-8",
        "w-[4.5rem]",
        "shrink-0"
      )
    }
  })

  it("fits a consistently sized action strip inside the Actions column", () => {
    renderJobList(mockJobs)

    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass(
      "w-72"
    )

    for (const actions of screen.getAllByTestId("row-actions")) {
      expect(actions).toHaveClass("min-w-[17rem]", "gap-0.5")
    }

    for (const label of ["Enable", "Disable", "Remove"]) {
      for (const button of screen.getAllByRole("button", { name: label })) {
        expect(button).toHaveClass("h-8", "w-[4.5rem]")
        expect(button).toHaveAttribute("data-variant", "outline")
      }
    }

    for (const trigger of screen.getAllByRole("button", {
      name: /View details for/,
    })) {
      expect(trigger).toHaveClass("h-8", "w-8", "shrink-0")
      expect(trigger.parentElement).toHaveClass("ml-auto")
    }
  })

  it("shows detailed hints for disabled controls", async () => {
    const user = userEvent.setup()
    const systemJob: JobListEntry = {
      ...mockJobs[1],
      label: "com.example.system-agent",
      plist_path: "/Library/LaunchAgents/com.example.system-agent.plist",
      source: "SystemAgent",
    }
    renderJobList([systemJob])

    const loadButton = screen.getByRole("button", { name: "Load agent" })
    expect(loadButton).toBeDisabled()

    const hintTrigger = loadButton.closest('span[tabindex="0"]')
    expect(hintTrigger).not.toBeNull()
    await user.hover(hintTrigger!)

    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip).toHaveTextContent("Load agent")
    expect(tooltip).toHaveTextContent(
      "System jobs are read-only here. Open details to inspect this job."
    )
  })

  it("opens system job details directly without an overflow menu", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const systemJob: JobListEntry = {
      ...mockJobs[0],
      label: "com.example.daemon",
      plist_path: "/Library/LaunchDaemons/com.example.daemon.plist",
      source: "SystemDaemon",
    }
    renderJobList([systemJob], { isAdministrator: true, onSelect })

    await user.click(
      screen.getByRole("button", {
        name: `View details for ${systemJob.label}`,
      })
    )

    expect(onSelect).toHaveBeenCalledWith(systemJob)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
  it("renders login items as a distinct, plist-free source", () => {
    renderJobList([loginItemJob])

    expect(screen.getByText("Login Item")).toBeInTheDocument()
    // Load/unload/restart/run-now have no meaning without a plist, so the slot is empty
    // but keeps its width to hold the Enable/Disable column alignment.
    expect(screen.getByTestId("row-icon-actions")).toBeEmptyDOMElement()
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument()
    expect(screen.getByTestId("enabled-badge")).toHaveTextContent("Enabled")
  })

  it("allows toggling a login item without administrator mode", () => {
    const onDisable = vi.fn()
    renderJobList([loginItemJob], { isAdministrator: false, onDisable })

    const toggle = screen.getByRole("button", { name: "Disable" })
    expect(toggle).toBeEnabled()
    fireEvent.click(toggle)
    expect(onDisable).toHaveBeenCalledWith(loginItemJob)
  })

  it("opens login item details directly without an overflow menu", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderJobList([loginItemJob], { onSelect })

    await user.click(
      screen.getByRole("button", {
        name: `View details for ${loginItemJob.label}`,
      })
    )

    expect(onSelect).toHaveBeenCalledWith(loginItemJob)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
