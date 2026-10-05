import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { JobDetail } from "./JobDetail"
import { resetFakeHandlers, setFakeHandler } from "@/test-utils/tauri-mock"

const PLIST = "/Users/test/Library/LaunchAgents/com.example.running-agent.plist"

function renderDetail() {
  return render(
    <JobDetail plistPath={PLIST} open onClose={vi.fn()} onEdit={vi.fn()} />
  )
}

describe("JobDetail", () => {
  afterEach(() => {
    resetFakeHandlers()
  })

  it("renders the details sheet on an explicit opaque surface", async () => {
    renderDetail()

    const title = await screen.findByRole("heading", {
      name: "com.example.running-agent",
    })
    const content = title.closest('[data-slot="sheet-content"]')

    expect(content).toHaveClass(
      "bg-white",
      "text-zinc-950",
      "dark:bg-zinc-950",
      "dark:text-zinc-50"
    )
    expect(content).not.toHaveClass(
      "animate-in",
      "fade-in-0",
      "zoom-in-95",
      "will-change-transform"
    )
  })

  it("renders a stable loading state before detail content enters", () => {
    setFakeHandler(
      "get_job_detail",
      () => new Promise(() => {})
    )

    renderDetail()

    expect(screen.getByText("Loading agent details…")).toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })

  it("keeps the header fixed and scrolls only the active tab panel", async () => {
    renderDetail()

    const title = await screen.findByRole("heading", {
      name: "com.example.running-agent",
    })
    const header = title.closest('[data-slot="sheet-header"]')
    expect(header).toHaveClass("shrink-0", "border-b")

    const panel = screen.getByRole("tabpanel")
    expect(panel).toHaveClass("overflow-y-auto", "flex-1", "min-h-0")
  })

  it("uses a clear active tab treatment that stays visible on light and dark surfaces", async () => {
    const user = userEvent.setup()
    renderDetail()

    const configTab = await screen.findByRole("tab", { name: "Configuration" })
    const logsTab = screen.getByRole("tab", { name: "Logs" })

    expect(configTab).toHaveAttribute("data-state", "active")
    expect(configTab).toHaveClass("bg-white", "text-zinc-950", "shadow-sm")
    expect(logsTab).not.toHaveClass("bg-white")

    await user.click(logsTab)

    expect(logsTab).toHaveClass("bg-white", "text-zinc-950", "shadow-sm")
    expect(configTab).not.toHaveClass("bg-white")
  })

  it("groups the detail tabs in a segmented control like the source filter", async () => {
    renderDetail()

    const tabList = await screen.findByRole("tablist", {
      name: "Agent detail sections",
    })

    expect(tabList).toHaveClass("rounded-lg", "bg-zinc-200/80", "p-0.5")
  })

  it("shows the plist path and summary metadata in the header", async () => {
    renderDetail()

    expect(await screen.findByText(PLIST)).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Source")).toBeInTheDocument()
    expect(screen.getByText("PID")).toBeInTheDocument()
    expect(screen.getByText("Last exit")).toBeInTheDocument()
  })

  it("renders a visible error state when the detail cannot be loaded", async () => {
    setFakeHandler("get_job_detail", () => {
      throw new Error("plist is unreadable")
    })

    renderDetail()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Could not load this agent")
    expect(alert).toHaveTextContent("plist is unreadable")
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })
  it("tailors the login item view and drops the plist-only Logs tab", async () => {
    const bundle =
      "/Applications/Spotify.app/Contents/Library/LoginItems/StartUpHelper.app"
    setFakeHandler("get_job_detail", () => ({
      label: "com.spotify.client.startuphelper",
      plist_path: bundle,
      source: "LoginItem",
      status: "Loaded",
      pid: null,
      last_exit_code: 0,
      last_run_at: null,
      plist: {
        label: "com.spotify.client.startuphelper",
        program: `${bundle}/Contents/MacOS/StartUpHelper`,
        program_arguments: null,
        run_at_load: null,
        keep_alive: null,
        start_interval: null,
        start_calendar_interval: null,
        standard_out_path: null,
        standard_error_path: null,
        working_directory: null,
        environment_variables: null,
        disabled: null,
        wake_system: null,
        raw_xml: "",
      },
    }))

    render(
      <JobDetail plistPath={bundle} open onClose={vi.fn()} onEdit={vi.fn()} />
    )

    await screen.findByRole("heading", { name: "com.spotify.client.startuphelper" })

    expect(screen.getByRole("tab", { name: "Configuration" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Commands" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Logs" })).not.toBeInTheDocument()

    expect(screen.getByText("Login item")).toBeInTheDocument()
    expect(screen.getByText("Spotify")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument()
  })
})
