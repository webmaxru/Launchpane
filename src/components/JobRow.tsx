import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/Hint"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { JobListEntry } from "@/types"
import {
  Eye,
  FolderOpen,
  Play,
  Square,
  RotateCw,
  MoreHorizontal,
  Power,
  Trash2,
  Zap,
  Loader2,
} from "lucide-react"
import type { PendingAction } from "@/types"
import type { SyntheticEvent } from "react"

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
        <Badge className="border-0 bg-success-soft text-success-foreground shadow-none">
          <span className="size-1.5 rounded-full bg-success" />
          Running
        </Badge>
      )
    case "Loaded":
      return (
        <Badge className="border-0 bg-accent text-accent-foreground shadow-none">
          <span className="size-1.5 rounded-full bg-primary" />
          Loaded
        </Badge>
      )
    case "Unloaded":
      return (
        <Badge className="border-0 bg-secondary text-secondary-foreground shadow-none">
          <span className="size-1.5 rounded-full bg-zinc-400" />
          Unloaded
        </Badge>
      )
    default:
      return (
        <Badge className="border-0 bg-warning-soft text-warning-foreground shadow-none">
          <span className="size-1.5 rounded-full bg-warning" />
          Unknown
        </Badge>
      )
  }
}

function SourceBadge({ source }: { source: JobListEntry["source"] }) {
  switch (source) {
    case "UserAgent":
      return (
        <Badge className="border-0 bg-secondary text-secondary-foreground shadow-none">
          User
        </Badge>
      )
    case "SystemAgent":
      return (
        <Badge className="border-0 bg-accent text-accent-foreground shadow-none">
          System
        </Badge>
      )
    case "SystemDaemon":
      return (
        <Badge className="border-0 bg-accent text-accent-foreground shadow-none">
          Daemon
        </Badge>
      )
    case "LoginItem":
      return (
        <Badge className="border-0 bg-secondary text-secondary-foreground shadow-none">
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
        ? "Enabling…"
        : pendingKind === "disable"
          ? "Disabling…"
          : "Loading…"
    return (
      <Badge
        className="border-0 bg-accent text-accent-foreground shadow-none"
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
        className="border-0 bg-success-soft text-success-foreground shadow-none"
        title="Enabled. launchd is allowed to load and run this job."
        data-testid="enabled-badge"
      >
        <span className="size-1.5 rounded-full bg-success" />
        Enabled
      </Badge>
    )
  }
  if (enabled === false) {
    return (
      <Badge
        className="border-0 bg-secondary text-secondary-foreground shadow-none"
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
      className="border-0 bg-warning-soft text-warning-foreground shadow-none"
      title="Unknown. The app could not determine whether launchd considers this job enabled."
      data-testid="enabled-badge"
    >
      <span className="size-1.5 rounded-full bg-warning" />
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
    isPending &&
    (pendingAction?.kind === "enable" || pendingAction?.kind === "disable")
  const pendingToggleKind =
    pendingAction?.kind === "enable" || pendingAction?.kind === "disable"
      ? pendingAction.kind
      : null
  const toggleLabel = job.enabled === true ? "Disable" : "Enable"
  const handleToggle = job.enabled === true ? onDisable : onEnable
  const primaryAction =
    !isUserAgent
      ? null
      : job.status === "Running"
        ? {
            label: "Stop",
            description:
              "Unload this running service now. Its plist file and enabled setting are unchanged.",
            icon: Square,
            run: onStop,
          }
        : job.status === "Loaded"
          ? {
              label: "Run now",
              description:
                "Ask launchd to start this loaded service immediately without changing its schedule.",
              icon: Zap,
              run: onKickstart,
            }
          : {
              label: "Load",
              description:
                "Register this plist with launchd now. This does not change whether the service is enabled.",
              icon: Play,
              run: onStart,
            }
  const PrimaryIcon = primaryAction?.icon
  const openDetails = () => {
    if (!isPending) onSelect(job)
  }
  const stopRowActivation = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <TableRow
      className="h-12 cursor-pointer outline-none hover:bg-accent/45 focus-visible:bg-accent/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      tabIndex={isPending ? -1 : 0}
      aria-label={`View details for ${job.label}`}
      aria-busy={isPending}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          openDetails()
        }
      }}
    >
      <TableCell
        className="max-w-0 truncate pl-4 font-medium"
        title={`${job.label} — open details`}
      >
        {job.label}
      </TableCell>
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
      <TableCell className="pr-3" onClick={stopRowActivation}>
        <div className="flex items-center justify-end gap-1" data-testid="row-actions">
          {primaryAction && PrimaryIcon && (
            <Hint label={primaryAction.label} description={primaryAction.description}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-16 bg-card"
                onClick={(event) => {
                  event.stopPropagation()
                  primaryAction.run(job)
                }}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PrimaryIcon className="h-3.5 w-3.5" />
                )}
                {primaryAction.label}
              </Button>
            </Hint>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isPending}
                aria-label={`Actions for ${job.label}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="truncate" title={job.label}>
                {job.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onSelect(job)}>
                <Eye />
                View details
              </DropdownMenuItem>
              {isUserAgent && job.status !== "Unloaded" && (
                <>
                  {job.status === "Loaded" && (
                    <DropdownMenuItem onSelect={() => onStop(job)}>
                      <Square />
                      Unload
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => onRestart(job)}>
                    <RotateCw />
                    Restart
                  </DropdownMenuItem>
                  {job.status === "Running" && (
                    <DropdownMenuItem onSelect={() => onKickstart(job)}>
                      <Zap />
                      Run now
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {canToggle && (
                <DropdownMenuItem onSelect={() => handleToggle(job)}>
                  {isTogglePending ? <Loader2 className="animate-spin" /> : <Power />}
                  {toggleLabel}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onRevealInFinder(job)}>
                <FolderOpen />
                Reveal in Finder
              </DropdownMenuItem>
              {isUserAgent && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(job)}
                  >
                    <Trash2 />
                    Remove agent…
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
