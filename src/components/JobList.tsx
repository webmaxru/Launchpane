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
  onRevealInFinder,
}: JobListProps) {
  return (
    <TooltipProvider delayDuration={450}>
      <Table className="table-fixed">
      <TableHeader className="bg-zinc-50/95 dark:bg-zinc-900/95">
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4 text-xs font-semibold text-muted-foreground">Label</TableHead>
          <TableHead className="w-24">Source</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-24">Enabled</TableHead>
          <TableHead className="w-16">PID</TableHead>
          <TableHead className="w-24">Last Run</TableHead>
          <TableHead className="w-80 pr-3 text-right text-xs font-semibold text-muted-foreground">
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
                <span>Loading agents...</span>
              </span>
            </TableCell>
          </TableRow>
        ) : jobs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
              No agents found
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
              onRevealInFinder={onRevealInFinder}
            />
          ))
        )}
      </TableBody>
      </Table>
    </TooltipProvider>
  )
}
