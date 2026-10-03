import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JobRow } from "@/components/JobRow"
import type { JobListEntry } from "@/types"

type JobListProps = {
  jobs: JobListEntry[]
  loading: boolean
  isAdministrator?: boolean
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
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading agents...
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No agents found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead className="w-24">Source</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-24">Enabled</TableHead>
          <TableHead className="w-16">PID</TableHead>
          <TableHead className="w-24">Last Run</TableHead>
          <TableHead className="w-80">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <JobRow
            key={job.plist_path}
            job={job}
            isAdministrator={isAdministrator}
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
        ))}
      </TableBody>
    </Table>
  )
}
