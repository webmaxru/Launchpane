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
    <div className="agent-toolbar">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by label"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 rounded-lg bg-card pl-9 shadow-sm"
        />
      </div>
      <div
        className="flex min-w-0 items-center overflow-x-auto rounded-lg bg-secondary p-0.5 md:justify-self-end"
        role="group"
        aria-label="Filter by source"
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
                ? "h-7 shrink-0 rounded-md bg-primary px-2.5 text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                : "h-7 shrink-0 rounded-md px-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
