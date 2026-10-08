import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EnabledBadge, JobRow } from "@/components/JobRow"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { JobListEntry, PendingAction } from "@/types"

type JobListProps = {
  jobs: JobListEntry[]
  loading: boolean
  emptyTitle?: string
  emptyDescription?: string
  isAdministrator?: boolean
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

export function JobList({
  jobs,
  loading,
  emptyTitle = "No background services found",
  emptyDescription = "Refresh the list or create a user agent.",
  isAdministrator = false,
  pendingAction = null,
  onStart,
  onStop,
  onRestart,
  onKickstart,
  onEnable,
  onDisable,
  onDelete,
  onSelect,
}: JobListProps) {
  return (
    <TooltipProvider delayDuration={450}>
      <Table className="table-fixed">
      <TableHeader className="bg-accent/30">
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4 text-xs font-semibold text-muted-foreground">
            Label
          </TableHead>
          <TableHead className="w-24">Source</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-24">Enabled</TableHead>
          <TableHead className="w-16">PID</TableHead>
          <TableHead className="w-24">Last Run</TableHead>
          <TableHead className="w-72 pr-3 text-right text-xs font-semibold text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground" aria-busy="true">
              <span className="inline-flex items-center gap-2">
                <EnabledBadge enabled={null} pendingKind="load" />
                <span>Loading background services…</span>
              </span>
            </TableCell>
          </TableRow>
        ) : jobs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-32 text-center">
              <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {emptyDescription}
              </p>
            </TableCell>
          </TableRow>
        ) : (
          jobs.map((job) => (
            <JobRow
              key={job.plist_path}
              job={job}
              isAdministrator={isAdministrator}
              pendingAction={pendingAction}
              onStart={onStart}
              onStop={onStop}
              onRestart={onRestart}
              onKickstart={onKickstart}
              onEnable={onEnable}
              onDisable={onDisable}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))
        )}
      </TableBody>
      </Table>
    </TooltipProvider>
  )
}
