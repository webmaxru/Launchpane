import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EnabledBadge, JobRow } from "@/components/JobRow"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { JobListEntry, PendingAction } from "@/types"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  RefreshCw,
  X,
} from "lucide-react"

type SortKey = "label" | "source" | "status" | "enabled" | "pid" | "lastRun"
type SortDirection = "ascending" | "descending"

type JobListProps = {
  jobs: JobListEntry[]
  loading: boolean
  error?: string | null
  emptyTitle?: string
  emptyDescription?: string
  hasActiveFilters?: boolean
  isAdministrator?: boolean
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
  onRetry?: () => void
  onCreate?: () => void
  onClearFilters?: () => void
}

export function JobList({
  jobs,
  loading,
  error = null,
  emptyTitle = "No background services found",
  emptyDescription = "Refresh the list or create a user agent.",
  hasActiveFilters = false,
  isAdministrator = false,
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
  onRetry,
  onCreate,
  onClearFilters,
}: JobListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("label")
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("ascending")
  const sortedJobs = useMemo(() => {
    const direction = sortDirection === "ascending" ? 1 : -1
    return [...jobs].sort((left, right) => {
      const values: Record<SortKey, [unknown, unknown]> = {
        label: [left.label, right.label],
        source: [left.source, right.source],
        status: [left.status, right.status],
        enabled: [left.enabled, right.enabled],
        pid: [left.pid, right.pid],
        lastRun: [Number(left.last_run_at ?? 0), Number(right.last_run_at ?? 0)],
      }
      const [leftValue, rightValue] = values[sortKey]
      if (leftValue == null && rightValue == null) return 0
      if (leftValue == null) return 1
      if (rightValue == null) return -1
      return (
        String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
        }) * direction
      )
    })
  }, [jobs, sortDirection, sortKey])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "ascending" ? "descending" : "ascending"
      )
      return
    }
    setSortKey(key)
    setSortDirection("ascending")
  }

  const sortHeader = (label: string, key: SortKey, className = "") => {
    const active = sortKey === key
    const Icon = active
      ? sortDirection === "ascending"
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown
    return (
      <TableHead
        className={className}
        aria-sort={active ? sortDirection : "none"}
      >
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 px-2 text-xs font-semibold text-muted-foreground"
          onClick={() => toggleSort(key)}
        >
          {label}
          <Icon className="h-3 w-3" />
        </Button>
      </TableHead>
    )
  }

  return (
    <TooltipProvider delayDuration={450}>
      <div
        className="grid gap-2 border-b bg-muted/35 px-4 py-2.5 text-xs text-muted-foreground sm:grid-cols-3"
        aria-label="How service state works"
      >
        <p><strong className="text-foreground">Enabled</strong> may load at login or on schedule.</p>
        <p><strong className="text-foreground">Loaded</strong> is registered with launchd.</p>
        <p><strong className="text-foreground">Running</strong> has an active process now.</p>
      </div>
      <Table className="table-fixed">
      <TableHeader className="bg-accent/30">
        <TableRow className="hover:bg-transparent">
          {sortHeader("Label", "label", "pl-4")}
          {sortHeader("Source", "source", "w-24")}
          {sortHeader("Status", "status", "w-24")}
          {sortHeader("Enabled", "enabled", "w-24")}
          {sortHeader("PID", "pid", "w-16")}
          {sortHeader("Last Run", "lastRun", "w-24")}
          <TableHead className="w-28 pr-3 text-right text-xs font-semibold text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && jobs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground" aria-busy="true">
              <span className="inline-flex items-center gap-2">
                <EnabledBadge enabled={null} pendingKind="load" />
                <span>Loading background services…</span>
              </span>
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell colSpan={7} className="h-48 text-center">
              <div
                role="alert"
                className="mx-auto flex max-w-lg flex-col items-center"
              >
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  Couldn’t load background services
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Launchpane can’t verify the services on this Mac right now.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {onRetry && (
                    <Button size="sm" onClick={onRetry}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  )}
                  <details className="text-left text-xs text-muted-foreground">
                    <summary className="cursor-pointer rounded px-2 py-1 hover:text-foreground">
                      Technical details
                    </summary>
                    <p className="mt-1 max-w-md break-words rounded-md bg-muted px-2 py-1.5 font-mono">
                      {error}
                    </p>
                  </details>
                </div>
              </div>
            </TableCell>
          </TableRow>
        ) : jobs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-40 text-center">
              <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {emptyDescription}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {hasActiveFilters && onClearFilters ? (
                  <Button variant="outline" size="sm" onClick={onClearFilters}>
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                ) : (
                  <>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                      </Button>
                    )}
                    {onCreate && (
                      <Button size="sm" onClick={onCreate}>
                        <Plus className="h-3.5 w-3.5" />
                        New Agent
                      </Button>
                    )}
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          sortedJobs.map((job) => (
            <JobRow
              key={job.plist_path}
              job={job}
              isAdministrator={isAdministrator}
              isAppStore={isAppStore}
              pendingAction={pendingAction}
              onStart={onStart}
              onStop={onStop}
              onRestart={onRestart}
              onKickstart={onKickstart}
              onEnable={onEnable}
              onDisable={onDisable}
              onDelete={onDelete}
              onSelect={onSelect}
              onRevealInFinder={onRevealInFinder}
            />
          ))
        )}
      </TableBody>
      </Table>
    </TooltipProvider>
  )
}
