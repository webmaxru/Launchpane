import { useLayoutEffect, useState, type ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/Hint"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CommandPanel } from "@/components/CommandPanel"
import { LogViewer } from "@/components/LogViewer"
import type { JobSource, JobStatus, LaunchdJob } from "@/types"
import { getJobDetail, revealInFinder } from "@/lib/invoke"
import { parentAppName } from "@/lib/login-items"
import { AlertCircle, FolderOpen, Loader2, Pencil } from "lucide-react"
import { formatCalendarIntervals } from "@/lib/calendar-utils"

type JobDetailProps = {
  plistPath: string | null
  open: boolean
  onClose: () => void
  onEdit: (job: LaunchdJob) => void
}

const SOURCE_LABELS: Record<JobSource, string> = {
  UserAgent: "User agent",
  SystemAgent: "System agent",
  SystemDaemon: "System daemon",
  LoginItem: "Login item",
}

function statusBadgeClass(status: JobStatus): string {
  switch (status) {
    case "Running":
      return "border-0 bg-success-soft text-success-foreground shadow-none"
    case "Loaded":
      return "border-0 bg-accent text-accent-foreground shadow-none"
    default:
      return "border-0 bg-zinc-100 text-zinc-600 shadow-none dark:bg-zinc-800 dark:text-zinc-300"
  }
}

function statusDotClass(status: JobStatus): string {
  switch (status) {
    case "Running":
      return "bg-success"
    case "Loaded":
      return "bg-primary"
    default:
      return "bg-zinc-400"
  }
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(Number(value))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString()
}

type DetailTab = "config" | "logs" | "commands"

const DETAIL_TABS: Array<{ value: DetailTab; label: string }> = [
  { value: "config", label: "Configuration" },
  { value: "logs", label: "Logs" },
  { value: "commands", label: "Commands" },
]

// Login items have no plist, so they expose no log paths to read.
const LOGIN_ITEM_TABS = DETAIL_TABS.filter((tab) => tab.value !== "logs")

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string | null
  children?: ReactNode
}) {
  if (!children && !value) return null
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-border/60 py-2 last:border-b-0 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-mono text-sm break-all">{children ?? value}</dd>
    </div>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export function JobDetail({ plistPath, open, onClose, onEdit }: JobDetailProps) {
  const [job, setJob] = useState<LaunchdJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>("config")

  useLayoutEffect(() => {
    if (!plistPath || !open) return
    let cancelled = false
    setJob(null)
    setLoading(true)
    setError(null)
    setActiveTab("config")
    getJobDetail(plistPath)
      .then((detail) => {
        if (!cancelled) setJob(detail)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setJob(null)
        setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [plistPath, open])

  const lastRun = formatTimestamp(job?.last_run_at)
  const isLoginItem = job?.source === "LoginItem"
  const tabs = isLoginItem ? LOGIN_ITEM_TABS : DETAIL_TABS
  const showLoading =
    open &&
    !!plistPath &&
    !error &&
    (loading || !job || job.plist_path !== plistPath)

  return (
    <TooltipProvider delayDuration={450}>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="flex h-full w-full flex-col gap-0 bg-card p-0 text-card-foreground sm:max-w-[44rem]">
        <SheetHeader className="shrink-0 gap-0 border-b px-6 py-5 pr-14">
          <SheetTitle className="truncate text-base font-semibold" title={job?.label}>
            {job?.label ?? (loading ? "Loading agent…" : "Agent details")}
          </SheetTitle>
          <SheetDescription
            className="truncate font-mono text-xs"
            title={job?.plist_path ?? plistPath ?? undefined}
          >
            {job?.plist_path ??
              plistPath ??
              "Agent details, configuration, logs, and controls."}
          </SheetDescription>

          {job && (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <MetaItem
                  label="Status"
                  value={
                    <Badge className={statusBadgeClass(job.status)}>
                      <span
                        className={`size-1.5 rounded-full ${statusDotClass(job.status)}`}
                      />
                      {job.status}
                    </Badge>
                  }
                />
                <MetaItem label="Source" value={SOURCE_LABELS[job.source]} />
                <MetaItem label="PID" value={job.pid ?? "—"} />
                <MetaItem label="Last exit" value={job.last_exit_code ?? "—"} />
                {lastRun && (
                  <div className="col-span-2 min-w-0 sm:col-span-4">
                    <MetaItem label="Last run" value={lastRun} />
                  </div>
                )}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {job.source === "UserAgent" && (
                  <Hint
                    label="Edit agent configuration"
                    description="Open this user agent’s plist in the form editor. Changes are saved back to the same file."
                  >
                    <Button size="sm" variant="outline" onClick={() => onEdit(job)}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </Hint>
                )}
                <Hint
                  label={
                    isLoginItem ? "Reveal helper in Finder" : "Reveal plist in Finder"
                  }
                  description={
                    isLoginItem
                      ? "Open the parent app’s LoginItems folder in Finder and select this helper bundle."
                      : "Open the containing folder in Finder and select this agent’s plist file."
                  }
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revealInFinder(job.plist_path)}
                  >
                    <FolderOpen className="mr-1 h-3 w-3" />
                    Reveal
                  </Button>
                </Hint>
              </div>
            </>
          )}
        </SheetHeader>

        {showLoading && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading agent details…
          </div>
        )}

        {!showLoading && error && (
          <div
            role="alert"
            className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
          >
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium">Could not load this agent</p>
            <p className="max-w-md text-xs text-muted-foreground break-words">{error}</p>
          </div>
        )}

        {!showLoading && !error && job && job.plist_path === plistPath && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DetailTab)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="shrink-0 border-b bg-muted/55 px-6 py-3">
              <TabsList
                className={`grid h-9 w-full rounded-lg bg-zinc-200/80 p-0.5 dark:bg-zinc-800 ${
                  tabs.length === 2 ? "grid-cols-2" : "grid-cols-3"
                }`}
                aria-label="Agent detail sections"
              >
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={
                      activeTab === tab.value
                      ? "h-8 rounded-md bg-card font-semibold text-foreground shadow-sm"
                      : "h-8 rounded-md font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent
              value="config"
              className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5"
            >
              {isLoginItem ? (
                <>
                  <Section title="Overview">
                    <dl>
                      <DetailRow label="Service label" value={job.label} />
                      <DetailRow
                        label="Parent app"
                        value={parentAppName(job.plist_path)}
                      />
                      <DetailRow label="Helper bundle" value={job.plist_path} />
                      <DetailRow label="Executable" value={job.plist.program} />
                    </dl>
                  </Section>
                  <Section title="Configuration">
                    <EmptyState>
                      This background helper is registered by its parent app through
                      macOS ServiceManagement, so it has no plist file to inspect or edit.
                      You can still enable or disable it from the list.
                    </EmptyState>
                  </Section>
                </>
              ) : (
                <>
              <Section title="General">
                <dl>
                  <DetailRow label="Label" value={job.plist.label} />
                  <DetailRow label="Program" value={job.plist.program} />
                  {job.plist.program_arguments &&
                    job.plist.program_arguments.length > 0 && (
                      <DetailRow label="Arguments">
                        <ol className="space-y-0.5">
                          {job.plist.program_arguments.map((arg, i) => (
                            <li key={i} className="break-all">
                              <span className="mr-1 text-muted-foreground">[{i}]</span>
                              {arg}
                            </li>
                          ))}
                        </ol>
                      </DetailRow>
                    )}
                  <DetailRow label="Working dir" value={job.plist.working_directory} />
                </dl>
              </Section>

              <Section title="Behavior">
                <dl>
                  <DetailRow
                    label="Run at load"
                    value={job.plist.run_at_load ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Keep alive"
                    value={job.plist.keep_alive ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Interval"
                    value={
                      job.plist.start_interval ? `${job.plist.start_interval}s` : null
                    }
                  />
                  {job.plist.wake_system && <DetailRow label="Wake system" value="Yes" />}
                  {job.plist.disabled && <DetailRow label="Disabled key" value="true" />}
                </dl>
              </Section>

              {job.plist.start_calendar_interval &&
                job.plist.start_calendar_interval.length > 0 && (
                  <Section title="Schedule">
                    <p className="text-sm">
                      {formatCalendarIntervals(job.plist.start_calendar_interval)}
                    </p>
                  </Section>
                )}

              <Section title="Log paths">
                {job.plist.standard_out_path || job.plist.standard_error_path ? (
                  <dl>
                    <DetailRow label="Stdout" value={job.plist.standard_out_path} />
                    <DetailRow label="Stderr" value={job.plist.standard_error_path} />
                  </dl>
                ) : (
                  <EmptyState>No log paths configured</EmptyState>
                )}
              </Section>

              {job.plist.environment_variables &&
                Object.keys(job.plist.environment_variables).length > 0 && (
                  <Section title="Environment variables">
                    <dl>
                      {Object.entries(job.plist.environment_variables).map(
                        ([key, value]) => (
                          <DetailRow key={key} label={key} value={value} />
                        )
                      )}
                    </dl>
                  </Section>
                )}
                </>
              )}
            </TabsContent>

            <TabsContent
              value="logs"
              className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5"
            >
              {job.plist.standard_out_path && (
                <Section title="Standard output">
                  <LogViewer logPath={job.plist.standard_out_path} />
                </Section>
              )}
              {job.plist.standard_error_path && (
                <Section title="Standard error">
                  <LogViewer logPath={job.plist.standard_error_path} />
                </Section>
              )}
              {!job.plist.standard_out_path && !job.plist.standard_error_path && (
                <EmptyState>No log paths configured for this agent</EmptyState>
              )}
            </TabsContent>

            <TabsContent
              value="commands"
              className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
            >
              <CommandPanel job={job} />
            </TabsContent>
          </Tabs>
        )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
