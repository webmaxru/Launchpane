import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/Hint"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { LaunchdJob } from "@/types"

type CommandPanelProps = {
  job: LaunchdJob
  isAppStore?: boolean
}

type CommandRow = {
  label: string
  command: string
  destructive?: boolean
}

export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value
  return `'${value.replace(/'/g, "'\\''")}'`
}

function domainFor(job: LaunchdJob): string {
  if (job.source === "SystemDaemon") return "system"
  return "gui/$(id -u)"
}

function sudoPrefix(job: LaunchdJob): string {
  return job.source === "SystemDaemon" ? "sudo " : ""
}

export function buildCommands(job: LaunchdJob): CommandRow[] {
  const prefix = sudoPrefix(job)
  const domain = domainFor(job)
  const target = `${domain}/${shellQuote(job.label)}`
  const plistPath = shellQuote(job.plist_path)

  const runtime = [
    { label: "Run now", command: `${prefix}launchctl kickstart ${target}` },
    { label: "Restart", command: `${prefix}launchctl kickstart -k ${target}` },
    { label: "Stop / Unload", command: `${prefix}launchctl bootout ${target}` },
    { label: "Enable", command: `${prefix}launchctl enable ${target}` },
    { label: "Disable", command: `${prefix}launchctl disable ${target}` },
    { label: "Status", command: `launchctl print ${target}` },
  ]
  if (job.source === "LoginItem") {
    return runtime
  }

  return [
    { label: "Load", command: `${prefix}launchctl bootstrap ${domain} ${plistPath}` },
    ...runtime,
    ...(job.source === "UserAgent" ? [{
      label: "Remove",
      command: `launchctl bootout ${target} && rm ${plistPath}`,
      destructive: true,
    }] : []),
  ]
}

export function CommandPanel({ job, isAppStore = false }: CommandPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const commands = buildCommands(job)

  const copyCommand = async (command: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable")
      }
      await navigator.clipboard.writeText(command)
      setCopied(command)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setCopied(null)
    }
  }

  return (
    <TooltipProvider delayDuration={450}>
      <section className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Terminal commands</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Equivalent launchctl commands for this agent.
          {" "}Run and restart require a loaded service; load requires enablement.
          {" "}Disable does not stop an existing service. Unloading a login item requires its parent app to register it again.
        </p>
        {isAppStore && (
          <p className="mt-2 text-xs text-muted-foreground">
            Mac App Store edition: these commands are reference only and are not executed by Launchpane.
            Copying a command does not grant sandbox access or enable administrator controls.
          </p>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {commands.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
          >
            <span
              className={
                item.destructive
                  ? "text-sm font-medium text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {item.label}
            </span>
            <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm">
                {item.command}
              </code>
              <Hint
                label={
                  copied === item.command
                    ? "Command copied"
                    : `Copy ${item.label.toLowerCase()} command`
                }
                description={
                  copied === item.command
                    ? "The complete terminal command is now on the clipboard."
                    : "Copy the complete command to the clipboard so you can paste it into Terminal."
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Copy ${item.label.toLowerCase()} command`}
                  onClick={() => void copyCommand(item.command)}
                >
                  {copied === item.command ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </Hint>
            </div>
          </div>
        ))}
      </div>
      </section>
    </TooltipProvider>
  )
}
