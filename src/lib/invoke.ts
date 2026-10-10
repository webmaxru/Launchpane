import { invoke } from "@tauri-apps/api/core"
import type { JobListEntry, LaunchdJob, PlistConfig } from "@/types"

type JobListEntryPayload = Omit<JobListEntry, "enabled"> & {
  enabled?: unknown
}

export function normalizeEnabledState(enabled: unknown): boolean | null {
  return enabled === true || enabled === false ? enabled : null
}

export const listJobs = async (): Promise<JobListEntry[]> => {
  const jobs = await invoke<JobListEntryPayload[]>("list_jobs")
  return jobs.map((job) => ({
    ...job,
    enabled: normalizeEnabledState(job.enabled),
  }))
}

export const getJobDetail = (plistPath: string) =>
  invoke<LaunchdJob>("get_job_detail", { plistPath })

export const startJob = (plistPath: string) =>
  invoke<void>("start_job", { plistPath })

export const stopJob = (plistPath: string) =>
  invoke<void>("stop_job", { plistPath })

export const restartJob = (plistPath: string) =>
  invoke<void>("restart_job", { plistPath })

export const kickstartJob = (label: string, plistPath: string) =>
  invoke<void>("kickstart_job", { label, plistPath })

export const enableJob = (
  label: string,
  plistPath: string,
  source: JobListEntry["source"]
) => invoke<boolean>("enable_job", { label, plistPath, source })

export const disableJob = (
  label: string,
  plistPath: string,
  source: JobListEntry["source"]
) => invoke<boolean>("disable_job", { label, plistPath, source })

export type RuntimeInfo = {
  is_administrator: boolean
  can_restart_as_administrator: boolean
  review_demo: boolean
}

export const getRuntimeInfo = () => invoke<RuntimeInfo>("get_runtime_info")

export const restartAsAdministrator = () =>
  invoke<void>("restart_as_administrator")

export const saveJob = (plistPath: string, config: PlistConfig) =>
  invoke<void>("save_job", { plistPath, config })

export const createJob = (label: string, config: PlistConfig) =>
  invoke<string>("create_job", { label, config })

export const deleteJob = (plistPath: string, label: string) =>
  invoke<void>("delete_job", { plistPath, label })

export type LogFileResult = {
  content: string
  modified_at: string | null
}

export const readLogFile = (path: string, tailLines?: number) =>
  invoke<LogFileResult>("read_log_file", { path, tailLines })

export const clearLogFile = (path: string) =>
  invoke<void>("clear_log_file", { path })

export const openLogInEditor = (path: string) =>
  invoke<void>("open_log_in_editor", { path })

export const getHomeDir = () => invoke<string>("get_home_dir")

export const revealInFinder = (path: string) =>
  invoke<void>("reveal_in_finder", { path })
