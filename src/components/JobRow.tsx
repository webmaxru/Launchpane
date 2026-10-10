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
import { useRef, useState, type SyntheticEvent } from "react"
import { actionAvailability, type RuntimeAction } from "@/lib/job-actions"

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
  isAppStore?: boolean
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
        title="Disabled. Future registration is blocked until enabled again. An already loaded service can still run."
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
  isAppStore = false,
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
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const [menuPlacement, setMenuPlacement] = useState<{
    side: "top" | "bottom"
    maxHeight: number
  } | null>(null)
  const placeMenu = (open: boolean) => {
    if (!open || !menuTriggerRef.current) return
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight
    const rect = menuTriggerRef.current.getBoundingClientRect()
    const above = Math.max(0, Math.min(viewportHeight, rect.top) - 12)
    const below = Math.max(0, viewportHeight - Math.max(0, rect.bottom) - 12)
    setMenuPlacement({
      side: above > below ? "top" : "bottom",
      maxHeight: Math.min(viewportHeight * 0.7, Math.max(above, below)),
    })
  }
  const isUserAgent = job.source === "UserAgent"
  const isLoginItem = job.source === "LoginItem"
  const isPending = pendingAction?.plistPath === job.plist_path
  const busy = pendingAction != null
  const isTogglePending =
    isPending &&
    (pendingAction?.kind === "enable" || pendingAction?.kind === "disable")
  const pendingToggleKind =
    isPending && (pendingAction?.kind === "enable" || pendingAction?.kind === "disable")
      ? pendingAction.kind
      : null
  const primaryAction =
    isLoginItem && job.status === "Unloaded"
      ? null
      : job.status === "Running"
        ? {
            action: "unload" as const,
            label: "Stop",
            description:
              "Stop and unregister this service. Its enabled setting is unchanged. For login items, the parent app must register the helper again.",
            icon: Square,
            run: onStop,
          }
        : job.status === "Loaded"
          ? {
              action: "run" as const,
              label: "Run now",
              description:
                "Ask launchd to start this loaded service immediately without changing its schedule.",
              icon: Zap,
              run: onKickstart,
            }
          : {
              action: "load" as const,
              label: "Load",
              description:
                "Register this plist with launchd now. This does not change whether the service is enabled.",
              icon: Play,
              run: onStart,
            }
  const PrimaryIcon = primaryAction?.icon
  const primaryState = primaryAction
    ? actionAvailability(job, primaryAction.action, isAdministrator, busy, isAppStore)
    : null
  const menuAction = (
    action: RuntimeAction,
    label: string,
    Icon: typeof Play,
    run: (job: JobListEntry) => void,
    description: string
  ) => {
    const availability = actionAvailability(job, action, isAdministrator, busy, isAppStore)
    if (availability.hidden) return null
    return (
      <DropdownMenuItem
        disabled={availability.reason !== null}
        aria-label={label}
        aria-description={availability.reason ?? description}
        onSelect={() => run(job)}
        title={availability.reason ?? description}
        className="items-start"
      >
        <Icon className="mt-0.5 shrink-0" />
        <span>
          {label}
          {availability.reason && (
            <span className="mt-0.5 block text-xs leading-relaxed">{availability.reason}</span>
          )}
        </span>
      </DropdownMenuItem>
    )
  }
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
      <TableCell className="pr-3" onClick={stopRowActivation} onKeyDown={stopRowActivation}>
        <div className="flex items-center justify-end gap-1" data-testid="row-actions">
          {primaryAction && PrimaryIcon && (
            <Hint
              label={primaryAction.label}
              description={primaryState?.reason ?? primaryAction.description}
              disabled={!!primaryState?.reason && !busy}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-w-16 bg-card"
                onClick={(event) => {
                  event.stopPropagation()
                  primaryAction.run(job)
                }}
                disabled={primaryState?.reason != null}
                title={primaryState?.reason ?? primaryAction.description}
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
          <DropdownMenu onOpenChange={placeMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isPending}
                aria-label={`Actions for ${job.label}`}
                ref={menuTriggerRef}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side={menuPlacement?.side}
              collisionPadding={8}
              style={{ maxHeight: menuPlacement?.maxHeight }}
              className="w-80 max-h-[min(70vh,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
            >
              <DropdownMenuLabel className="truncate" title={job.label}>
                {job.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onSelect(job)}>
                <Eye />
                View details
              </DropdownMenuItem>
              {menuAction("load", "Load", Play, onStart, "Register the enabled plist with launchd; RunAtLoad or KeepAlive may start it immediately.")}
              {menuAction("run", "Run now", Zap, onKickstart, "Start a loaded service without changing its schedule or enabled setting.")}
              {menuAction("unload", "Unload", Square, onStop, "Stop and unregister this service without disabling it. A login item's parent app must register it again.")}
              {menuAction("restart", "Restart", RotateCw, onRestart, "Terminate the current instance, if any, and ask launchd to start a new one.")}
              {menuAction("enable", "Enable", Power, onEnable, "Allow future registration. Does not load or start the service.")}
              {menuAction("disable", "Disable", Power, onDisable, "Prevent future registration. Does not stop a loaded or running service.")}
              <DropdownMenuItem onSelect={() => onRevealInFinder(job)}>
                <FolderOpen />
                Reveal in Finder
              </DropdownMenuItem>
              {isUserAgent && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={busy}
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
