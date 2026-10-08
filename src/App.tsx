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
    title: "Enable Agent",
    description:
      "launchd will be allowed to load and run this agent, including at login or on its schedule.",
    confirmLabel: "Enable",
    destructive: false,
  },
  disable: {
    title: "Disable Agent",
    description:
      "launchd will stop loading this agent. It will not run again until you enable it.",
    confirmLabel: "Disable",
    destructive: false,
  },
  delete: {
    title: "Remove Agent",
    description:
      "This will stop the agent and permanently delete its plist file. This cannot be undone.",
    confirmLabel: "Remove",
    destructive: true,
  },
}

type ConfirmCopy = (typeof CONFIRM_COPY)[ConfirmKind]

const LOGIN_ITEM_CONFIRM_COPY: Partial<Record<ConfirmKind, ConfirmCopy>> = {
  enable: {
    title: "Enable Login Item",
    description:
      "This app’s background helper will be allowed to launch again at login.",
    confirmLabel: "Enable",
    destructive: false,
  },
  disable: {
    title: "Disable Login Item",
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
          `Failed to read runtime privileges: ${String(e)}`
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
              `Failed to ${verb} ${job.label}: verified state is ${actualState}, expected ${expectedState}.`
            )
            return false
          }
          successMessage = `${job.label} is now ${expectedEnabled ? "enabled" : "disabled"}.`
        }

        try {
          await refresh()
        } catch (e) {
          successMessage = `${successMessage} The list could not be refreshed: ${String(e)}`
        }

        showActionFeedback("success", successMessage)
        return true
      } catch (e) {
        showActionFeedback(
          "error",
          `Failed to ${verb} ${job.label}: ${String(e)}`
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

  const handleRestartAsAdministrator = async () => {
    setAdminLaunching(true)
    showActionFeedback("loading", "Starting administrator mode…")
    try {
      await restartAsAdministrator()
      showActionFeedback("success", "Administrator window started.")
    } catch (e) {
      showActionFeedback(
        "error",
        `Failed to start administrator mode: ${String(e)}`
      )
    } finally {
      setAdminLaunching(false)
    }
  }

  return (
    <TooltipProvider delayDuration={450}>
      <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200/90 bg-zinc-100/95 px-5 py-3 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
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
              <p className="text-xs text-muted-foreground">
                {filteredJobs.length} {filteredJobs.length === 1 ? "agent" : "agents"}
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
                className="w-52 bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
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
              <div className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
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
                  className="rounded-lg bg-white dark:bg-zinc-900"
                >
                  <Shield className="mr-1 h-4 w-4" />
                  {adminLaunching ? "Starting..." : "Start as Administrator"}
                </Button>
              </Hint>
            ) : null}
            <Hint
              label="Refresh agent list"
              description="Read the latest launchd state and plist metadata from disk without changing any jobs."
            >
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="rounded-lg bg-white dark:bg-zinc-900"
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
                className="rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
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

      <main className="space-y-4 p-5">
        <section
          className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          aria-label="Agent filters"
        >
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
          />
        </section>

        <section
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          aria-label="Launchd agents"
        >
          <JobList
            jobs={filteredJobs}
            loading={loading}
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
              className="pointer-events-auto flex items-start gap-2 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700 shadow-xl dark:border-red-900 dark:bg-zinc-900 dark:text-red-300"
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
              className={`pointer-events-auto flex items-start gap-2 rounded-xl border bg-white p-3 text-sm shadow-xl dark:bg-zinc-900 ${
                actionFeedback.kind === "error"
                  ? "border-destructive/40 text-destructive"
                  : actionFeedback.kind === "success"
                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    : "border-blue-500/40 text-blue-700 dark:text-blue-300"
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
        <DialogContent className="border-zinc-200 bg-white text-zinc-950 sm:max-w-[26rem] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
          <DialogHeader>
            <DialogTitle>
              {confirmRequest ? confirmCopy(confirmRequest).title : ""}
            </DialogTitle>
            <DialogDescription>
              {confirmRequest ? confirmCopy(confirmRequest).description : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm break-all dark:border-zinc-800 dark:bg-zinc-900">
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
                  : "bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
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
