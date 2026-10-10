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
  openProjectPage,
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
import { STORE_ADMIN_REASON } from "@/lib/job-actions"

const FEEDBACK_DISMISS_MS = 4000
const REVIEW_DEMO_LABEL = "com.launchpane.review.demo"
const REVIEW_DEMO_CONFIG: PlistConfig = {
  label: REVIEW_DEMO_LABEL,
  program: "/usr/bin/true",
  program_arguments: ["/usr/bin/true"],
  run_at_load: false,
  keep_alive: false,
  start_interval: null,
  start_calendar_interval: null,
  standard_out_path: null,
  standard_error_path: null,
  working_directory: null,
  environment_variables: null,
  disabled: false,
  wake_system: false,
  raw_xml: "",
}

type ActionFeedback = {
  id: number
  kind: "loading" | "success" | "error"
  message: string
  detail?: string
}

type ConfirmKind = "enable" | "disable" | "delete" | "unload"

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
  unload: {
    title: "Unload login item",
    description:
      "Stop and unregister this helper from launchd. Enable will not reload it; open the parent app and use its login-item settings to register it again. The parent app may also register it automatically.",
    confirmLabel: "Unload",
    destructive: false,
  },
  enable: {
    title: "Enable agent",
    description:
      "Allow future registration with launchd. This does not load or start the service now; use Load, then Run now if needed.",
    confirmLabel: "Enable",
    destructive: false,
  },
  disable: {
    title: "Disable agent",
    description:
      "Prevent future registration until you enable this service again. This does not stop a loaded or running service; use Stop or Unload separately.",
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
      "Allow future registration of this app’s helper. This does not register or start it now; the parent app controls registration.",
    confirmLabel: "Enable",
    destructive: false,
  },
  disable: {
    title: "Disable login item",
    description:
      "Prevent future registration of this app’s helper. This does not stop an already loaded helper. The parent app may turn it back on from its own settings.",
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
    jobs,
    filteredJobs,
    loading,
    error,
    search,
    setSearch,
    sourceFilter,
    setSourceFilter,
    refresh,
  } = useJobs()
  const jobsRef = useRef(jobs)
  jobsRef.current = jobs
  const loadingRef = useRef(loading)
  loadingRef.current = loading
  const errorRef = useRef(error)
  errorRef.current = error

  const [selectedPlistPath, setSelectedPlistPath] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingJob, setEditingJob] = useState<LaunchdJob | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const pendingActionRef = useRef<PendingAction | null>(null)
  const editOpenTimerRef = useRef<number | null>(null)
  const feedbackIdRef = useRef(0)
  const [isAdministrator, setIsAdministrator] = useState(false)
  const [isAppStore, setIsAppStore] = useState(false)
  const [canStartAdministrator, setCanStartAdministrator] = useState(false)
  const [adminLaunching, setAdminLaunching] = useState(false)
  const [reviewDemo, setReviewDemo] = useState(false)
  const [reviewDemoConfig, setReviewDemoConfig] = useState<PlistConfig | undefined>()
  const reviewDemoStartedRef = useRef(false)

  const showActionFeedback = useCallback(
    (kind: ActionFeedback["kind"], message: string, detail?: string) => {
      feedbackIdRef.current += 1
      setActionFeedback({ id: feedbackIdRef.current, kind, message, detail })
    },
    []
  )

  useEffect(() => {
    getRuntimeInfo()
      .then((info) => {
        setIsAppStore(info.is_app_store)
        setIsAdministrator(info.is_administrator)
        setCanStartAdministrator(info.can_restart_as_administrator)
        setReviewDemo(info.review_demo)
        if (info.review_demo) setSearch(" ")
      })
      .catch((e) =>
        showActionFeedback(
          "error",
          "Couldn’t read administrator status.",
          errorMessage(e)
        )
      )
  }, [showActionFeedback])

  useEffect(() => {
    if (!actionFeedback || actionFeedback.kind !== "success") return undefined

    const timeoutId = window.setTimeout(() => {
      setActionFeedback((current) =>
        current?.id === actionFeedback.id ? null : current
      )
    }, FEEDBACK_DISMISS_MS)

    return () => window.clearTimeout(timeoutId)
  }, [actionFeedback])

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
        } catch {
          successMessage = `${successMessage} The list may be out of date because refresh failed.`
        }

        showActionFeedback("success", successMessage)
        return true
      } catch (e) {
        showActionFeedback(
          "error",
          `Couldn’t ${verb} ${job.label}.`,
          errorMessage(e)
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
    if (kind === "unload") {
      void handleAction("stop", "unload", "unloaded", job, () => stopJob(job.plist_path))
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
  const openCreateForm = useCallback(() => {
    setEditingJob(null)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }, [])
  const retryList = useCallback(() => {
    void refresh().catch(() => undefined)
  }, [refresh])
  const clearFilters = useCallback(() => {
    setSearch("")
    setSourceFilter("All")
  }, [setSearch, setSourceFilter])

  useEffect(() => {
    if (!reviewDemo || reviewDemoStartedRef.current) return undefined
    reviewDemoStartedRef.current = true
    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

    const run = async () => {
      let demoPath: string | null = null
      try {
        while (loadingRef.current) await wait(150)
        if (errorRef.current) {
          throw new Error(`Could not load the service inventory: ${errorRef.current}`)
        }
        if (jobsRef.current.length === 0) {
          throw new Error("The service inventory is empty.")
        }
        const systemJob =
          jobsRef.current.find((job) => job.source === "SystemDaemon") ??
          jobsRef.current.find((job) => job.source === "SystemAgent")
        if (!systemJob) {
          throw new Error("No system-owned service is available for the walkthrough.")
        }

        // Leave a clean opening state on screen before the guided review flow begins.
        await wait(5000)
        setSearch(systemJob.label)

        await wait(4000)
        setSearch("")
        setSourceFilter(
          systemJob.source === "SystemDaemon" ? "SystemDaemon" : "SystemAgent"
        )

        await wait(4000)
        handleSelect(systemJob)

        await wait(5000)
        setDetailOpen(false)
        setSourceFilter("All")
        const existingDemo = jobsRef.current.find(
          (job) => job.label === REVIEW_DEMO_LABEL
        )
        if (existingDemo) {
          await deleteJob(existingDemo.plist_path, REVIEW_DEMO_LABEL)
          await refresh()
        }
        setReviewDemoConfig(REVIEW_DEMO_CONFIG)
        setEditingJob(null)
        setFormKey((key) => key + 1)
        setFormOpen(true)

        await wait(6000)
        demoPath = await createJob(REVIEW_DEMO_LABEL, REVIEW_DEMO_CONFIG)
        setFormOpen(false)
        setReviewDemoConfig(undefined)
        await refresh()
        setSearch(REVIEW_DEMO_LABEL)
        showActionFeedback("success", `${REVIEW_DEMO_LABEL} created successfully.`)

        await wait(4000)
        setSelectedPlistPath(demoPath)
        setDetailOpen(true)

        await wait(6000)
        setDetailOpen(false)
        const demoJob = jobsRef.current.find(
          (job) => job.plist_path === demoPath
        )
        if (!demoJob) {
          throw new Error("The temporary review agent was not present for removal.")
        }
        setConfirmRequest({ kind: "delete", job: demoJob })
        await wait(4000)
        setConfirmRequest(null)
        const removed = await handleAction("delete", "remove", "removed", demoJob, () =>
          deleteJob(demoJob.plist_path, REVIEW_DEMO_LABEL)
        )
        if (!removed) {
          throw new Error("The temporary review agent could not be removed.")
        }
        demoPath = null
        await wait(5000)
      } catch (cause) {
        setFormOpen(false)
        setConfirmRequest(null)
        let cleanupError: unknown
        if (demoPath) {
          try {
            await deleteJob(demoPath, REVIEW_DEMO_LABEL)
            await refresh()
          } catch (cleanupCause) {
            cleanupError = cleanupCause
          }
        }
        showActionFeedback(
          "error",
          cleanupError
            ? "The walkthrough failed and the temporary agent could not be removed."
            : "The App Review walkthrough could not finish.",
          cleanupError
            ? errorMessage(cleanupError)
            : errorMessage(cause)
        )
      }
    }

    void run()
  }, [
    handleAction,
    handleSelect,
    refresh,
    reviewDemo,
    setSearch,
    setSourceFilter,
    showActionFeedback,
  ])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        document.getElementById("service-search")?.focus()
      } else if (event.key.toLowerCase() === "r" && !isTyping) {
        event.preventDefault()
        retryList()
      } else if (event.key.toLowerCase() === "n" && !isTyping) {
        event.preventDefault()
        openCreateForm()
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [openCreateForm, retryList])

  const handleRestartAsAdministrator = async () => {
    setAdminLaunching(true)
    showActionFeedback("loading", "Opening administrator window…")
    try {
      await restartAsAdministrator()
      showActionFeedback("success", "Administrator window opened.")
    } catch (e) {
      showActionFeedback(
        "error",
        "Couldn’t open the administrator window.",
        errorMessage(e)
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
                {error
                  ? "Services unavailable"
                  : hasActiveFilters
                    ? `${filteredJobs.length} of ${jobs.length} services`
                    : `${filteredJobs.length} ${filteredJobs.length === 1 ? "service" : "services"}`}
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
            ) : canStartAdministrator || isAppStore ? (
              <Hint
                label="Start an administrator window"
                description={
                  isAppStore
                    ? STORE_ADMIN_REASON
                    : adminLaunching
                    ? "Authentication succeeded and the privileged app window is starting."
                    : "Authenticate with macOS and open a privileged window for loading, running, restarting, unloading, enabling and disabling system daemons."
                }
                disabled={adminLaunching || isAppStore}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRestartAsAdministrator()}
                  disabled={adminLaunching || isAppStore}
                  title={isAppStore ? STORE_ADMIN_REASON : undefined}
                  className="rounded-lg bg-card"
                  aria-label="Open Administrator Window"
                >
                  <Shield className="h-4 w-4 lg:mr-1" />
                  <span className="hidden lg:inline">
                    {adminLaunching ? "Opening…" : "Open Administrator Window"}
                  </span>
                  <span className="lg:hidden">
                    {adminLaunching ? "Opening…" : "Admin"}
                  </span>
                </Button>
              </Hint>
            ) : null}
            <Hint
              label="Refresh service list"
              description="Reload launchd state and plist metadata without changing any services. Shortcut: R."
            >
              <Button
                variant="outline"
                size="sm"
                onClick={retryList}
                aria-keyshortcuts="R"
                aria-label="Refresh service list"
                disabled={loading}
                className="rounded-lg bg-card"
              >
                <RefreshCw
                  className={`h-4 w-4 md:mr-1 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden md:inline">
                  {loading ? "Refreshing…" : "Refresh"}
                </span>
              </Button>
            </Hint>
            <Hint
              label="Create a user agent"
              description="Open the editor for a new plist in your personal LaunchAgents folder. Shortcut: N."
            >
              <Button
                size="sm"
                className="rounded-lg shadow-sm"
                onClick={openCreateForm}
                aria-keyshortcuts="N"
                aria-label="Create a user agent"
              >
                <Plus className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">New Agent</span>
              </Button>
            </Hint>
          </div>
        </div>
      </header>

      <main className="p-4">
        {isAppStore && (
          <aside
            aria-label="Mac App Store edition limits"
            className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground"
          >
            <p className="min-w-0 flex-1">
              <strong className="text-foreground">Mac App Store edition.</strong>{" "}
              No administrator access; shared services are read-only. Login helpers support Enable and Disable only.
            </p>
            <a
              href="https://github.com/webmaxru/Launchpane"
              className="shrink-0 rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              onClick={(event) => {
                event.preventDefault()
                void openProjectPage().catch((e) =>
                  showActionFeedback("error", "Couldn’t open the project page.", errorMessage(e))
                )
              }}
            >
              Project documentation and source on GitHub
            </a>
          </aside>
        )}
        <section
          className="overflow-hidden rounded-xl border bg-card shadow-sm"
          aria-label="Background services"
        >
          <div
            className="border-b bg-accent/35 p-3"
            aria-label="Service filters"
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
            error={error}
            hasActiveFilters={hasActiveFilters}
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
            isAppStore={isAppStore}
            pendingAction={pendingAction}
            onStart={(job) =>
              handleAction("start", "load", "loaded", job, () =>
                startJob(job.plist_path)
              )
            }
            onStop={(job) =>
              job.source === "LoginItem"
                ? setConfirmRequest({ kind: "unload", job })
                : handleAction("stop", "unload", "unloaded", job, () =>
                    stopJob(job.plist_path)
                  )
            }
            onRestart={(job) =>
              handleAction("restart", "restart", "restart requested", job, () =>
                restartJob(job.plist_path)
              )
            }
            onKickstart={(job) =>
              handleAction("kickstart", "start", "run requested", job, () =>
                kickstartJob(job.label, job.plist_path)
              )
            }
            onEnable={(job) => setConfirmRequest({ kind: "enable", job })}
            onDisable={(job) => setConfirmRequest({ kind: "disable", job })}
            onDelete={(job) => setConfirmRequest({ kind: "delete", job })}
            onSelect={handleSelect}
            onRevealInFinder={(job) => revealInFinder(job.plist_path)}
            onRetry={retryList}
            onCreate={openCreateForm}
            onClearFilters={clearFilters}
          />
        </section>
      </main>

      {actionFeedback && (
        <div
          data-testid="feedback-region"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
          aria-live="polite"
          aria-relevant="additions text"
        >
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
              <div className="min-w-0 flex-1">
                <p>{actionFeedback.message}</p>
                {actionFeedback.detail && (
                  <details className="mt-1 text-xs opacity-80">
                    <summary className="cursor-pointer">Technical details</summary>
                    <p className="mt-1 break-words font-mono">
                      {actionFeedback.detail}
                    </p>
                  </details>
                )}
              </div>
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
        isAppStore={isAppStore}
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
        initialConfig={reviewDemoConfig}
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
