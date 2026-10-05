import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/Hint"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableCell, TableRow } from "@/components/ui/table"
import type { JobListEntry } from "@/types"
import {
  Play,
  Square,
  RotateCw,
  MoreHorizontal,
  FileText,
  FolderOpen,
  Zap,
  Loader2,
} from "lucide-react"
import type { PendingAction } from "@/types"

function formatRelativeTime(epochMillis: string): string {
  const ms = Number(epochMillis)
  if (isNaN(ms)) return "—"
  const diff = Date.now() - ms
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const date = new Date(ms)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

type JobRowProps = {
  job: JobListEntry
  isAdministrator: boolean
  pendingAction?: PendingAction | null
  onStart: (job: JobListEntry) => void
  onStop: (job: JobListEntry) => void
  onRestart: (job: JobListEntry) => void
  onKickstart: (job: JobListEntry) => void
  onEnable: (job: JobListEntry) => void
  onDisable: (job: JobListEntry) => void
  onDelete: (job: JobListEntry) => void
  onSelect: (job: JobListEntry) => void
  onRevealInFinder: (job: JobListEntry) => void
}

function StatusBadge({ status }: { status: JobListEntry["status"] }) {
  switch (status) {
    case "Running":
      return (
        <Badge className="border-0 bg-emerald-50 text-emerald-700 shadow-none dark:bg-emerald-950/60 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Running
        </Badge>
      )
    case "Loaded":
      return (
        <Badge className="border-0 bg-blue-50 text-blue-700 shadow-none dark:bg-blue-950/60 dark:text-blue-300">
          <span className="size-1.5 rounded-full bg-blue-500" />
          Loaded
        </Badge>
      )
    case "Unloaded":
      return (
        <Badge className="border-0 bg-zinc-100 text-zinc-600 shadow-none dark:bg-zinc-800 dark:text-zinc-300">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          Unloaded
        </Badge>
      )
    default:
      return (
        <Badge className="border-0 bg-amber-50 text-amber-700 shadow-none dark:bg-amber-950/50 dark:text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Unknown
        </Badge>
      )
  }
}

function SourceBadge({ source }: { source: JobListEntry["source"] }) {
  switch (source) {
    case "UserAgent":
      return (
        <Badge className="border-0 bg-zinc-100 text-zinc-600 shadow-none dark:bg-zinc-800 dark:text-zinc-300">
          User
        </Badge>
      )
    case "SystemAgent":
      return (
        <Badge className="border-0 bg-blue-50 text-blue-700 shadow-none dark:bg-blue-950/50 dark:text-blue-300">
          System
        </Badge>
      )
    case "SystemDaemon":
      return (
        <Badge className="border-0 bg-purple-50 text-purple-700 shadow-none dark:bg-purple-950/50 dark:text-purple-300">
          Daemon
        </Badge>
      )
    case "LoginItem":
      return (
        <Badge className="border-0 bg-orange-50 text-orange-700 shadow-none dark:bg-orange-950/50 dark:text-orange-300">
          Login Item
        </Badge>
      )
  }
}

type EnabledBadgeProps = {
  enabled: unknown
  pendingKind?: "enable" | "disable" | "load" | null
}

export function EnabledBadge({ enabled, pendingKind = null }: EnabledBadgeProps) {
  if (pendingKind) {
    const label =
      pendingKind === "enable"
        ? "Enabling..."
        : pendingKind === "disable"
          ? "Disabling..."
          : "Loading..."
    return (
      <Badge
        className="border-0 bg-blue-50 text-blue-700 shadow-none dark:bg-blue-950/50 dark:text-blue-300"
        title={`${label} The enabled state is being updated and verified with launchd.`}
        data-testid="enabled-badge"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {label}
      </Badge>
    )
  }
  if (enabled === true) {
    return (
      <Badge
        className="border-0 bg-emerald-50 text-emerald-700 shadow-none dark:bg-emerald-950/60 dark:text-emerald-300"
        title="Enabled. launchd is allowed to load and run this job."
        data-testid="enabled-badge"
      >
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Enabled
      </Badge>
    )
  }
  if (enabled === false) {
    return (
      <Badge
        className="border-0 bg-zinc-100 text-zinc-600 shadow-none dark:bg-zinc-800 dark:text-zinc-300"
        title="Disabled. launchd will not load this job until it is enabled again."
        data-testid="enabled-badge"
      >
        <span className="size-1.5 rounded-full bg-zinc-400" />
        Disabled
      </Badge>
    )
  }
  return (
    <Badge
      className="border-0 bg-amber-50 text-amber-700 shadow-none dark:bg-amber-950/50 dark:text-amber-300"
      title="Unknown. The app could not determine whether launchd considers this job enabled."
      data-testid="enabled-badge"
    >
      <span className="size-1.5 rounded-full bg-amber-500" />
      Unknown
    </Badge>
  )
}

export function JobRow({
  job,
  isAdministrator,
  pendingAction = null,
  onStart,
  onStop,
  onRestart,
  onKickstart,
  onEnable,
  onDisable,
  onDelete,
  onSelect,
  onRevealInFinder,
}: JobRowProps) {
  const isUserAgent = job.source === "UserAgent"
  const isLoginItem = job.source === "LoginItem"
  const canToggle = isUserAgent || isLoginItem || isAdministrator
  const isPending = pendingAction?.plistPath === job.plist_path
  const isTogglePending =
    isPending && (pendingAction?.kind === "enable" || pendingAction?.kind === "disable")
  const pendingToggleKind =
    pendingAction?.kind === "enable" || pendingAction?.kind === "disable"
      ? pendingAction.kind
      : null
  const toggleLabel = job.enabled === true ? "Disable" : "Enable"
  const handleToggle = job.enabled === true ? onDisable : onEnable
  const pendingDescription = "Wait for the current operation on this job to finish."
  const systemActionDescription =
    "System jobs are read-only in the table. Use Details to inspect the job."
  const toggleDescription = isPending
    ? pendingDescription
    : !canToggle
      ? "Open an administrator window to change whether launchd may load this system job."
      : isLoginItem
        ? job.enabled === true
          ? "Stop this app’s background helper from launching at login. The parent app may turn it back on from its own settings."
          : "Allow this app’s background helper to launch at login again."
        : job.enabled === true
          ? "Prevent launchd from loading this job again. You will confirm before the change is applied."
          : "Allow launchd to load this job again. You will confirm before the change is applied."

  return (
    <TableRow className="h-12 hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
      <TableCell className="max-w-0 truncate pl-4 font-medium" title={job.label}>{job.label}</TableCell>
      <TableCell>
        <SourceBadge source={job.source} />
      </TableCell>
      <TableCell>
        <StatusBadge status={job.status} />
      </TableCell>
      <TableCell aria-busy={isTogglePending}>
        <EnabledBadge enabled={job.enabled} pendingKind={pendingToggleKind} />
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {job.pid ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {job.last_run_at ? formatRelativeTime(job.last_run_at) : "—"}
      </TableCell>
      <TableCell className="pr-3">
        <div
          className="flex w-full min-w-[18.625rem] items-center justify-end gap-0.5"
          data-testid="row-actions"
        >
          <div
            className="flex w-[6.25rem] shrink-0 items-center justify-start gap-0.5"
            data-testid="row-icon-actions"
          >
            {isLoginItem ? null : (
              <>
            {job.status === "Running" ? (
              <Hint
                label="Stop agent"
                description={
                  isPending
                    ? pendingDescription
                    : isUserAgent
                      ? "Unload this running job from launchd. Its plist file and enabled setting are unchanged."
                      : systemActionDescription
                }
                disabled={!isUserAgent || isPending}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onStop(job)}
                  disabled={!isUserAgent || isPending}
                  aria-label="Stop agent"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </Hint>
            ) : job.status === "Loaded" ? (
              <Hint
                label="Unload agent"
                description={
                  isPending
                    ? pendingDescription
                    : isUserAgent
                      ? "Remove this loaded job from launchd without deleting its plist or changing its enabled setting."
                      : systemActionDescription
                }
                disabled={!isUserAgent || isPending}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onStop(job)}
                  disabled={!isUserAgent || isPending}
                  aria-label="Unload agent"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </Hint>
            ) : (
              <Hint
                label="Load agent"
                description={
                  isPending
                    ? pendingDescription
                    : isUserAgent
                      ? "Register this plist with launchd now. This does not change whether the job is enabled."
                      : systemActionDescription
                }
                disabled={!isUserAgent || isPending}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onStart(job)}
                  disabled={!isUserAgent || isPending}
                  aria-label="Load agent"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </Hint>
            )}
            {job.status !== "Unloaded" && (
              <Hint
                label="Restart agent"
                description={
                  isPending
                    ? pendingDescription
                    : isUserAgent
                      ? "Unload and immediately load this job again so launchd starts it with its current configuration."
                      : systemActionDescription
                }
                disabled={!isUserAgent || isPending}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onRestart(job)}
                  disabled={!isUserAgent || isPending}
                  aria-label="Restart agent"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </Hint>
            )}
            {(job.status === "Running" || job.status === "Loaded") && (
              <Hint
                label="Run agent now"
                description={
                  isPending
                    ? pendingDescription
                    : isUserAgent
                      ? "Ask launchd to start this loaded job immediately, without changing its schedule or enabled setting."
                      : systemActionDescription
                }
                disabled={!isUserAgent || isPending}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onKickstart(job)}
                  disabled={!isUserAgent || isPending}
                  aria-label="Run agent now"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </Hint>
            )}
              </>
            )}
          </div>
          <Hint
            label={`${toggleLabel} ${isLoginItem ? "login item" : "agent"}`}
            description={toggleDescription}
            disabled={!canToggle || isPending}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-20 shrink-0 justify-center bg-white dark:bg-zinc-900"
              onClick={() => handleToggle(job)}
              disabled={!canToggle || isPending}
            >
              {isTogglePending && (
                <Loader2
                  className="h-3 w-3 animate-spin"
                  data-testid="toggle-spinner"
                  aria-hidden="true"
                />
              )}
              {toggleLabel}
            </Button>
          </Hint>
          <div className="flex w-20 shrink-0 items-center justify-start">
            {isUserAgent && (
              <Hint
                label="Remove agent"
                description={
                  isPending
                    ? pendingDescription
                    : "Stop this agent and permanently delete its plist file. You will confirm before removal."
                }
                disabled={isPending}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-20 border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => onDelete(job)}
                  disabled={isPending}
                >
                  Remove
                </Button>
              </Hint>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isPending}>
              <span className="ml-auto inline-flex">
                <Hint
                  label="More actions"
                  description={
                    isPending
                      ? pendingDescription
                      : isLoginItem
                        ? "Open details or reveal this login item’s helper bundle in Finder."
                        : "Open details, reveal the plist in Finder, or run the agent immediately."
                  }
                  disabled={isPending}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isPending}
                    aria-label={`More actions for ${job.label}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </Hint>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {!isLoginItem && (
                <DropdownMenuItem
                  onClick={() => onKickstart(job)}
                  disabled={!isUserAgent || isPending}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Run Now
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onSelect(job)}>
                <FileText className="mr-2 h-4 w-4" />
                Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRevealInFinder(job)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Reveal in Finder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
