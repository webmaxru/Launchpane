import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { SourceFilter } from "@/types"
import { Search } from "lucide-react"

type SearchBarProps = {
  search: string
  onSearchChange: (value: string) => void
  sourceFilter: SourceFilter
  onSourceFilterChange: (value: SourceFilter) => void
}

const sourceOptions: Array<{ value: SourceFilter; label: string }> = [
  { value: "All", label: "All" },
  { value: "UserAgent", label: "User" },
  { value: "Home", label: "Home" },
  { value: "SystemAgent", label: "System" },
  { value: "SystemDaemon", label: "Daemon" },
  { value: "LoginItem", label: "Login Items" },
]

export function SearchBar({
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
}: SearchBarProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search agents"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 rounded-lg border-zinc-300 bg-white pl-9 shadow-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div
        className="flex shrink-0 items-center rounded-lg bg-zinc-200/80 p-0.5 dark:bg-zinc-800"
        role="group"
        aria-label="Filter agents by source"
      >
        {sourceOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => onSourceFilterChange(option.value)}
            aria-pressed={sourceFilter === option.value}
            className={
              sourceFilter === option.value
                ? "h-7 rounded-md bg-white px-3 text-zinc-950 shadow-sm hover:bg-white dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-700"
                : "h-7 rounded-md px-3 text-zinc-600 hover:bg-white/60 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700/70 dark:hover:text-white"
            }
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
