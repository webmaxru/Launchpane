import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
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

const noop = vi.fn()

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
    expect(screen.getByText("Loading agents...")).toBeInTheDocument()
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
    expect(screen.getByText("No agents found")).toBeInTheDocument()
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
    const runButtons = screen.getAllByRole("button", { name: "Run now" })
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
    screen.getByRole("button", { name: "Run now" }).click()
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
    expect(screen.queryByRole("button", { name: "Enable" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument()
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
})
