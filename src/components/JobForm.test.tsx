import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { JobForm } from "./JobForm"
import type { LaunchdJob } from "@/types"

const editingJob: LaunchdJob = {
  label: "com.example.agent",
  plist_path: "/Users/test/Library/LaunchAgents/com.example.agent.plist",
  source: "UserAgent",
  status: "Loaded",
  pid: null,
  last_exit_code: 0,
  last_run_at: null,
  plist: {
    label: "com.example.agent",
    program: "/usr/bin/true",
    program_arguments: ["/usr/bin/true"],
    run_at_load: true,
    keep_alive: false,
    start_interval: null,
    start_calendar_interval: null,
    standard_out_path: null,
    standard_error_path: null,
    working_directory: null,
    environment_variables: null,
    disabled: false,
    wake_system: false,
    raw_xml: "",
  },
}

describe("JobForm", () => {
  it("renders the edit window on an explicit opaque surface", () => {
    render(
      <JobForm
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
        editingJob={editingJob}
      />
    )

    const title = screen.getByRole("heading", { name: "Edit Agent" })
    const content = title.closest('[data-slot="dialog-content"]')

    expect(content).toHaveClass(
      "bg-card",
      "text-card-foreground"
    )
    expect(content).toHaveClass(
      "flex",
      "flex-col",
      "min-h-0",
      "overflow-hidden"
    )
    expect(content).not.toHaveClass("grid")
    expect(content).not.toHaveClass(
      "animate-in",
      "fade-in-0",
      "zoom-in-95"
    )

    const header = title.closest('[data-slot="dialog-header"]')
    expect(header).toHaveClass("bg-card")

    const body = content?.querySelector(".overflow-y-auto")
    expect(body).toHaveClass("bg-card")

    const footer = content?.querySelector('[data-slot="dialog-footer"]')
    expect(footer).toHaveClass("bg-muted/45")
  })
})
