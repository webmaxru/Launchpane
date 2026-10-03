import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/SearchBar"
import { JobList } from "@/components/JobList"
import { JobDetail } from "@/components/JobDetail"
import { JobForm } from "@/components/JobForm"
import { useJobs } from "@/hooks/useJobs"
import {
  startJob,
  stopJob,
  restartJob,
  kickstartJob,
  enableJob,
  disableJob,
  deleteJob,
  saveJob,
  createJob,
  revealInFinder,
} from "@/lib/invoke"
import type { JobListEntry, LaunchdJob, PlistConfig } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Monitor, Moon, Plus, RefreshCw, Sun } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

function App() {
  const {
    filteredJobs,
    loading,
    error,
    search,
    setSearch,
    sourceFilter,
    setSourceFilter,
    refresh,
  } = useJobs()

  const [selectedPlistPath, setSelectedPlistPath] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingJob, setEditingJob] = useState<LaunchdJob | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobListEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const handleAction = useCallback(
    async (
      verb: string,
      pastTense: string,
      job: JobListEntry,
      action: () => Promise<void>
    ) => {
      setActionError(null)
      setActionSuccess(null)
      try {
        await action()
        await refresh()
        setActionSuccess(`${job.label} ${pastTense} successfully.`)
        return true
      } catch (e) {
        setActionError(`Failed to ${verb} ${job.label}: ${String(e)}`)
        return false
      }
    },
    [refresh]
  )

  const handleSelect = useCallback((job: JobListEntry) => {
    setSelectedPlistPath(job.plist_path)
    setDetailOpen(true)
  }, [])

  const handleEdit = useCallback((job: LaunchdJob) => {
    setEditingJob(job)
    setFormKey((k) => k + 1)
    setFormOpen(true)
    setDetailOpen(false)
  }, [])

  const handleSave = useCallback(
    async (config: PlistConfig, plistPath?: string) => {
      if (plistPath) {
        await saveJob(plistPath, config)
      } else {
        await createJob(config.label, config)
      }
      await refresh()
    },
    [refresh]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    const removed = await handleAction(
      "remove",
      "removed",
      deleteTarget,
      () => deleteJob(deleteTarget.plist_path, deleteTarget.label)
    )
    if (removed) setDeleteTarget(null)
  }, [deleteTarget, handleAction])

  const { theme, cycle } = useTheme()
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={cycle}
              aria-label={`Theme: ${theme}`}
              title={`Theme: ${theme}`}
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">launchd-ui</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingJob(null)
                setFormKey((k) => k + 1)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Agent
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-3 space-y-3">
        <SearchBar
          search={search}
          onSearchChange={setSearch}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
        />

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {actionError}
          </div>
        )}

        {actionSuccess && (
          <div
            role="status"
            className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
          >
            {actionSuccess}
          </div>
        )}

        <div className="rounded-md border">
          <JobList
            jobs={filteredJobs}
            loading={loading}
            onStart={(job) =>
              handleAction("load", "loaded", job, () =>
                startJob(job.plist_path)
              )
            }
            onStop={(job) =>
              handleAction("unload", "unloaded", job, () =>
                stopJob(job.plist_path)
              )
            }
            onRestart={(job) =>
              handleAction("restart", "restarted", job, () =>
                restartJob(job.plist_path)
              )
            }
            onKickstart={(job) =>
              handleAction("start", "started", job, () =>
                kickstartJob(job.label, job.plist_path)
              )
            }
            onEnable={(job) =>
              handleAction("enable", "enabled", job, () =>
                enableJob(job.label, job.plist_path)
              )
            }
            onDisable={(job) =>
              handleAction("disable", "disabled", job, () =>
                disableJob(job.label, job.plist_path)
              )
            }
            onDelete={(job) => setDeleteTarget(job)}
            onSelect={handleSelect}
            onRevealInFinder={(job) => revealInFinder(job.plist_path)}
          />
        </div>
      </main>

      <JobDetail
        plistPath={selectedPlistPath}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
      />

      <JobForm
        key={formKey}
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingJob(null)
        }}
        onSave={handleSave}
        editingJob={editingJob}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove{" "}
            <span className="font-mono font-medium text-foreground">
              {deleteTarget?.label}
            </span>
            ? This will stop the agent and remove its plist file.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
