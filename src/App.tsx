import { useState, useCallback, useEffect, useRef } from "react"
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
  getRuntimeInfo,
  restartAsAdministrator,
} from "@/lib/invoke"
import type { JobListEntry, LaunchdJob, PlistConfig } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Hint } from "@/components/Hint"
import appIconUrl from "@/assets/app-icon.svg"
import {
  AlertCircle,
  CheckCircle2,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sun,
  Loader2,
  X,
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { errorMessage } from "@/lib/errors"
import type { JobActionKind, PendingAction } from "@/types"

const FEEDBACK_DISMISS_MS = 4000

type ActionFeedback = {
  id: number
  kind: "loading" | "success" | "error"
  message: string
}

type ConfirmKind = "enable" | "disable" | "delete"

type ConfirmRequest = {
  kind: ConfirmKind
  job: JobListEntry
}

const CONFIRM_COPY: Record<
  ConfirmKind,
  {
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
  }
> = {
  enable: {
    title: "Enable agent",
    description:
      "Allow launchd to load and run this agent at login or on its schedule.",
    confirmLabel: "Enable",
    destructive: false,
  },
  disable: {
    title: "Disable agent",
    description:
      "Prevent launchd from loading this agent again until you enable it.",
    confirmLabel: "Disable",
    destructive: false,
  },
  delete: {
    title: "Remove agent",
    description:
      "Stop this agent and permanently delete its plist file. You can’t undo this.",
    confirmLabel: "Remove",
    destructive: true,
  },
}

type ConfirmCopy = (typeof CONFIRM_COPY)[ConfirmKind]

const LOGIN_ITEM_CONFIRM_COPY: Partial<Record<ConfirmKind, ConfirmCopy>> = {
  enable: {
    title: "Enable login item",
    description:
      "Allow this app’s background helper to launch at login.",
    confirmLabel: "Enable",
    destructive: false,
  },
  disable: {
    title: "Disable login item",
    description:
      "macOS will stop launching this app’s background helper at login. The parent app may turn it back on from its own settings.",
    confirmLabel: "Disable",
    destructive: false,
  },
}

function confirmCopy(request: ConfirmRequest): ConfirmCopy {
  if (request.job.source === "LoginItem") {
    return LOGIN_ITEM_CONFIRM_COPY[request.kind] ?? CONFIRM_COPY[request.kind]
  }
  return CONFIRM_COPY[request.kind]
}

function actionProgressText(verb: string, label: string) {
  const progressVerbs: Record<string, string> = {
    disable: "Disabling",
    enable: "Enabling",
    load: "Loading",
    remove: "Removing",
    restart: "Restarting",
    start: "Starting",
    unload: "Unloading",
  }
  return `${progressVerbs[verb] ?? `${verb.charAt(0).toUpperCase()}${verb.slice(1)}ing`} ${label}…`
}

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
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null)
  const [visibleListError, setVisibleListError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const pendingActionRef = useRef<PendingAction | null>(null)
  const editOpenTimerRef = useRef<number | null>(null)
  const feedbackIdRef = useRef(0)
  const [isAdministrator, setIsAdministrator] = useState(false)
  const [canStartAdministrator, setCanStartAdministrator] = useState(false)
  const [adminLaunching, setAdminLaunching] = useState(false)

  const showActionFeedback = useCallback(
    (kind: ActionFeedback["kind"], message: string) => {
      feedbackIdRef.current += 1
      setActionFeedback({ id: feedbackIdRef.current, kind, message })
    },
    []
  )

  useEffect(() => {
    getRuntimeInfo()
      .then((info) => {
        setIsAdministrator(info.is_administrator)
        setCanStartAdministrator(info.can_restart_as_administrator)
      })
      .catch((e) =>
        showActionFeedback(
          "error",
          `Couldn’t read administrator status. ${errorMessage(e)}`
        )
      )
  }, [showActionFeedback])

  useEffect(() => {
    if (!actionFeedback || actionFeedback.kind === "loading") return undefined

    const timeoutId = window.setTimeout(() => {
      setActionFeedback((current) =>
        current?.id === actionFeedback.id ? null : current
      )
    }, FEEDBACK_DISMISS_MS)

    return () => window.clearTimeout(timeoutId)
  }, [actionFeedback])

  useEffect(() => {
    if (!error) {
      setVisibleListError(null)
      return undefined
    }

    setVisibleListError(error)
    const timeoutId = window.setTimeout(() => {
      setVisibleListError((current) => (current === error ? null : current))
    }, FEEDBACK_DISMISS_MS)

    return () => window.clearTimeout(timeoutId)
  }, [error])

  const handleAction = useCallback(
    async (
      kind: JobActionKind,
      verb: string,
      pastTense: string,
      job: JobListEntry,
      action: () => Promise<void | boolean>
    ) => {
      if (pendingActionRef.current) return false

      const nextPendingAction = { plistPath: job.plist_path, kind }
      pendingActionRef.current = nextPendingAction
      setPendingAction(nextPendingAction)
      showActionFeedback("loading", actionProgressText(verb, job.label))
      try {
        const result = await action()
        let successMessage = `${job.label} ${pastTense} successfully.`

        if (kind === "enable" || kind === "disable") {
          const expectedEnabled = kind === "enable"
          if (result !== expectedEnabled) {
            const expectedState = expectedEnabled ? "enabled" : "disabled"
            const actualState = result === true ? "enabled" : "disabled"
            showActionFeedback(
              "error",
              `Couldn’t ${verb} ${job.label}. launchd reported ${actualState}, not ${expectedState}.`
            )
            return false
          }
          successMessage = `${job.label} is now ${expectedEnabled ? "enabled" : "disabled"}.`
        }

        try {
          await refresh()
        } catch (e) {
          successMessage = `${successMessage} The list may be out of date because refresh failed. ${errorMessage(e)}`
        }

        showActionFeedback("success", successMessage)
        return true
      } catch (e) {
        showActionFeedback(
          "error",
          `Couldn’t ${verb} ${job.label}. ${errorMessage(e)}`
        )
        return false
      } finally {
        pendingActionRef.current = null
        setPendingAction(null)
      }
    },
    [refresh, showActionFeedback]
  )

  const handleSelect = useCallback((job: JobListEntry) => {
    setSelectedPlistPath(job.plist_path)
    setDetailOpen(true)
  }, [])

  const handleEdit = useCallback((job: LaunchdJob) => {
    if (editOpenTimerRef.current !== null) {
      window.clearTimeout(editOpenTimerRef.current)
    }
    setDetailOpen(false)
    setEditingJob(job)
    setFormKey((k) => k + 1)
    editOpenTimerRef.current = window.setTimeout(() => {
      editOpenTimerRef.current = null
      setFormOpen(true)
    }, 150)
  }, [])

  useEffect(
    () => () => {
      if (editOpenTimerRef.current !== null) {
        window.clearTimeout(editOpenTimerRef.current)
      }
    },
    []
  )

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

  const handleConfirm = useCallback(() => {
    if (!confirmRequest) return
    const { kind, job } = confirmRequest
    setConfirmRequest(null)

    if (kind === "enable") {
      void handleAction("enable", "enable", "enabled", job, () =>
        enableJob(job.label, job.plist_path, job.source)
      )
      return
    }
    if (kind === "disable") {
      void handleAction("disable", "disable", "disabled", job, () =>
        disableJob(job.label, job.plist_path, job.source)
      )
      return
    }
    void handleAction("delete", "remove", "removed", job, () =>
      deleteJob(job.plist_path, job.label)
    )
  }, [confirmRequest, handleAction])

  const { theme, setTheme } = useTheme()
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor
  const themeLabel =
    theme === "system" ? "System appearance" : `${theme[0].toUpperCase()}${theme.slice(1)} appearance`
  const hasActiveFilters = search.trim().length > 0 || sourceFilter !== "All"

  const handleRestartAsAdministrator = async () => {
    setAdminLaunching(true)
    showActionFeedback("loading", "Opening administrator window…")
    try {
      await restartAsAdministrator()
      showActionFeedback("success", "Administrator window opened.")
    } catch (e) {
      showActionFeedback(
        "error",
        `Couldn’t open the administrator window. ${errorMessage(e)}`
      )
    } finally {
      setAdminLaunching(false)
    }
  }

  return (
    <TooltipProvider delayDuration={450}>
      <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-2.5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={appIconUrl}
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 select-none"
              draggable={false}
            />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-tight">
                Launchpane
              </h1>
              <p className="text-xs tabular-nums text-muted-foreground">
                {filteredJobs.length}{" "}
                {filteredJobs.length === 1 ? "service" : "services"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="inline-flex">
                  <Hint
                    label="Choose appearance"
                    description={`${themeLabel} is active. Choose Light, Dark, or follow the macOS system setting.`}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      aria-label={`Appearance: ${theme}`}
                    >
                      <ThemeIcon className="h-4 w-4" />
                    </Button>
                  </Hint>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-popover text-popover-foreground"
              >
                <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(value) =>
                    setTheme(value as "system" | "light" | "dark")
                  }
                >
                  <DropdownMenuRadioItem value="system">
                    <Monitor />
                    System
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light">
                    <Sun />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon />
                    Dark
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {isAdministrator ? (
              <div className="flex h-8 items-center gap-1.5 rounded-lg border border-success/35 bg-success-soft px-2.5 text-xs font-medium text-success-foreground">
                <ShieldCheck className="h-4 w-4" />
                Administrator
              </div>
            ) : canStartAdministrator ? (
              <Hint
                label="Start an administrator window"
                description={
                  adminLaunching
                    ? "Authentication succeeded and the privileged app window is starting."
                    : "Authenticate with macOS and open a separate privileged window for changing system job enablement."
                }
                disabled={adminLaunching}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRestartAsAdministrator()}
                  disabled={adminLaunching}
                  className="rounded-lg bg-card"
                >
                  <Shield className="mr-1 h-4 w-4" />
                  {adminLaunching ? "Opening…" : "Open Administrator Window"}
                </Button>
              </Hint>
            ) : null}
            <Hint
              label="Refresh agent list"
              description="Reload launchd state and plist metadata without changing any jobs."
            >
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="rounded-lg bg-card"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Refresh
              </Button>
            </Hint>
            <Hint
              label="Create a user agent"
              description="Open the editor for a new plist in your personal LaunchAgents folder."
            >
              <Button
                size="sm"
                className="rounded-lg shadow-sm"
                onClick={() => {
                  setEditingJob(null)
                  setFormKey((k) => k + 1)
                  setFormOpen(true)
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                New Agent
              </Button>
            </Hint>
          </div>
        </div>
      </header>

      <main className="p-4">
        <section
          className="overflow-hidden rounded-xl border bg-card shadow-sm"
          aria-label="Launchd agents"
        >
          <div
            className="border-b bg-accent/35 p-3"
            aria-label="Agent filters"
          >
            <SearchBar
              search={search}
              onSearchChange={setSearch}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
            />
          </div>
          <JobList
            jobs={filteredJobs}
            loading={loading}
            emptyTitle={
              hasActiveFilters
                ? "No services match your filters"
                : "No background services found"
            }
            emptyDescription={
              hasActiveFilters
                ? "Try a different search or source filter."
                : "Refresh the list or create a user agent."
            }
            isAdministrator={isAdministrator}
            pendingAction={pendingAction}
            onStart={(job) =>
              handleAction("start", "load", "loaded", job, () =>
                startJob(job.plist_path)
              )
            }
            onStop={(job) =>
              handleAction("stop", "unload", "unloaded", job, () =>
                stopJob(job.plist_path)
              )
            }
            onRestart={(job) =>
              handleAction("restart", "restart", "restarted", job, () =>
                restartJob(job.plist_path)
              )
            }
            onKickstart={(job) =>
              handleAction("kickstart", "start", "started", job, () =>
                kickstartJob(job.label, job.plist_path)
              )
            }
            onEnable={(job) => setConfirmRequest({ kind: "enable", job })}
            onDisable={(job) => setConfirmRequest({ kind: "disable", job })}
            onDelete={(job) => setConfirmRequest({ kind: "delete", job })}
            onSelect={handleSelect}
            onRevealInFinder={(job) => revealInFinder(job.plist_path)}
          />
        </section>
      </main>

      {(visibleListError || actionFeedback) && (
        <div
          data-testid="feedback-region"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {visibleListError && (
            <div
              role="alert"
              aria-atomic="true"
              className="pointer-events-auto flex items-start gap-2 rounded-xl border border-red-200 bg-card p-3 text-sm text-red-700 shadow-xl dark:border-red-900 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{visibleListError}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                onClick={() => setVisibleListError(null)}
                aria-label="Dismiss list error"
              >
                <X />
              </Button>
            </div>
          )}

          {actionFeedback && (
            <div
              data-testid="action-feedback"
              role={actionFeedback.kind === "error" ? "alert" : "status"}
              aria-atomic="true"
              className={`pointer-events-auto flex items-start gap-2 rounded-xl border bg-card p-3 text-sm shadow-xl ${
                actionFeedback.kind === "error"
                  ? "border-destructive/40 text-destructive"
                  : actionFeedback.kind === "success"
                    ? "border-success/40 text-success-foreground"
                    : "border-primary/40 text-primary"
              }`}
            >
              {actionFeedback.kind === "loading" ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : actionFeedback.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 flex-1">{actionFeedback.message}</span>
              {actionFeedback.kind !== "loading" && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={
                    actionFeedback.kind === "error"
                      ? "text-destructive hover:text-destructive"
                      : "text-current hover:text-current"
                  }
                  onClick={() =>
                    setActionFeedback((current) =>
                      current?.id === actionFeedback.id ? null : current
                    )
                  }
                  aria-label={`Dismiss ${actionFeedback.kind}`}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

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
        open={!!confirmRequest}
        onOpenChange={(isOpen) => !isOpen && setConfirmRequest(null)}
      >
        <DialogContent         className="bg-popover text-popover-foreground sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle>
              {confirmRequest ? confirmCopy(confirmRequest).title : ""}
            </DialogTitle>
            <DialogDescription>
              {confirmRequest ? confirmCopy(confirmRequest).description : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg border bg-muted/60 px-3 py-2 font-mono text-sm break-all">
            {confirmRequest?.job.label}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRequest(null)}>
              Cancel
            </Button>
            <Button
              variant={
                confirmRequest && confirmCopy(confirmRequest).destructive
                  ? "destructive"
                  : "default"
              }
              className={
                confirmRequest && confirmCopy(confirmRequest).destructive
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : undefined
              }
              onClick={handleConfirm}
            >
              {confirmRequest ? confirmCopy(confirmRequest).confirmLabel : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default App
