import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { buildCommands, CommandPanel, shellQuote } from "@/components/CommandPanel"
import type { LaunchdJob } from "@/types"

function job(overrides: Partial<LaunchdJob>): LaunchdJob {
  return {
    label: "com.example.agent",
    plist_path: "/Users/test/Library/LaunchAgents/com.example.agent.plist",
    source: "UserAgent",
    status: "Running",
    pid: 1234,
    last_exit_code: 0,
    last_run_at: null,
    plist: {
      label: "com.example.agent",
      program: "/usr/bin/true",
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
    ...overrides,
  }
}

describe("CommandPanel command builders", () => {
  it("distinguishes Store command references from in-app execution", () => {
    render(<CommandPanel job={job({ source: "SystemDaemon" })} isAppStore />)
    expect(screen.getByText(/Mac App Store edition: these commands are reference only/)).toHaveTextContent(
      "Copying a command does not grant sandbox access or enable administrator controls."
    )
    expect(screen.getByRole("button", { name: "Copy restart command" })).toBeEnabled()
  })

  it("quotes shell paths only when needed", () => {
    expect(shellQuote("/tmp/com.example.plist")).toBe("/tmp/com.example.plist")
    expect(shellQuote("/tmp/Launch Agents/example's job.plist")).toBe(
      "'/tmp/Launch Agents/example'\\''s job.plist'"
    )
  })

  it("builds user agent commands like the backend launchctl wrapper", () => {
    const commands = buildCommands(job({}))

    expect(commands.map((item) => item.command)).toEqual([
      "launchctl bootstrap gui/$(id -u) /Users/test/Library/LaunchAgents/com.example.agent.plist",
      "launchctl kickstart gui/$(id -u)/com.example.agent",
      "launchctl kickstart -k gui/$(id -u)/com.example.agent",
      "launchctl bootout gui/$(id -u)/com.example.agent",
      "launchctl enable gui/$(id -u)/com.example.agent",
      "launchctl disable gui/$(id -u)/com.example.agent",
      "launchctl print gui/$(id -u)/com.example.agent",
      "launchctl bootout gui/$(id -u)/com.example.agent && rm /Users/test/Library/LaunchAgents/com.example.agent.plist",
    ])
  })

  it("quotes labels in service targets", () => {
    const commands = buildCommands(
      job({
        label: "com.example.agent's job",
      })
    )

    expect(commands.map((item) => item.command)).toContain(
      "launchctl kickstart -k gui/$(id -u)/'com.example.agent'\\''s job'"
    )
    expect(commands.map((item) => item.command)).toContain(
      "launchctl enable gui/$(id -u)/'com.example.agent'\\''s job'"
    )
    expect(commands.map((item) => item.command)).toContain(
      "launchctl disable gui/$(id -u)/'com.example.agent'\\''s job'"
    )
  })

  it("uses the user's GUI domain without sudo for Library agents", () => {
    const commands = buildCommands(
      job({
        source: "SystemAgent",
        plist_path: "/Library/LaunchAgents/com.example.agent.plist",
      })
    )

    expect(commands.map((item) => item.command)).toEqual([
      "launchctl bootstrap gui/$(id -u) /Library/LaunchAgents/com.example.agent.plist",
      "launchctl kickstart gui/$(id -u)/com.example.agent",
      "launchctl kickstart -k gui/$(id -u)/com.example.agent",
      "launchctl bootout gui/$(id -u)/com.example.agent",
      "launchctl enable gui/$(id -u)/com.example.agent",
      "launchctl disable gui/$(id -u)/com.example.agent",
      "launchctl print gui/$(id -u)/com.example.agent",
    ])
  })

  it("uses the system domain for system daemons", () => {
    const commands = buildCommands(
      job({
        source: "SystemDaemon",
        plist_path: "/Library/LaunchDaemons/com.example.agent.plist",
      })
    )

    expect(commands.map((item) => item.command)).toEqual([
      "sudo launchctl bootstrap system /Library/LaunchDaemons/com.example.agent.plist",
      "sudo launchctl kickstart system/com.example.agent",
      "sudo launchctl kickstart -k system/com.example.agent",
      "sudo launchctl bootout system/com.example.agent",
      "sudo launchctl enable system/com.example.agent",
      "sudo launchctl disable system/com.example.agent",
      "launchctl print system/com.example.agent",
    ])
  })
  it("offers plist-free runtime controls and no load or remove for login items", () => {
    const commands = buildCommands(
      job({
        label: "com.spotify.client.startuphelper",
        source: "LoginItem",
        plist_path:
          "/Applications/Spotify.app/Contents/Library/LoginItems/StartUpHelper.app",
      })
    )

    expect(commands.map((item) => item.command)).toEqual([
      "launchctl kickstart gui/$(id -u)/com.spotify.client.startuphelper",
      "launchctl kickstart -k gui/$(id -u)/com.spotify.client.startuphelper",
      "launchctl bootout gui/$(id -u)/com.spotify.client.startuphelper",
      "launchctl enable gui/$(id -u)/com.spotify.client.startuphelper",
      "launchctl disable gui/$(id -u)/com.spotify.client.startuphelper",
      "launchctl print gui/$(id -u)/com.spotify.client.startuphelper",
    ])
    expect(commands.some((item) => item.destructive)).toBe(false)
  })
})
