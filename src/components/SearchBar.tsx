import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { SourceFilter } from "@/types"
import { Filter, Search, X } from "lucide-react"

type SearchBarProps = {
  search: string
  onSearchChange: (value: string) => void
  sourceFilter: SourceFilter
  onSourceFilterChange: (value: SourceFilter) => void
}

const sourceOptions: Array<{
  value: SourceFilter
  label: string
  description: string
}> = [
  { value: "All", label: "All services", description: "Every discovered source" },
  {
    value: "Home",
    label: "My agents",
    description: "Automations you created in your LaunchAgents folder",
  },
  {
    value: "UserAgent",
    label: "User agents",
    description: "All agents in your user LaunchAgents folder",
  },
  {
    value: "SystemAgent",
    label: "System agents",
    description: "Read-only agents installed for all users",
  },
  {
    value: "SystemDaemon",
    label: "System daemons",
    description: "Read-only background services owned by macOS",
  },
  {
    value: "LoginItem",
    label: "Login items",
    description: "Helpers registered by installed applications",
  },
]

export function SearchBar({
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
}: SearchBarProps) {
  const selectedSource =
    sourceOptions.find((option) => option.value === sourceFilter) ??
    sourceOptions[0]
  const hasActiveFilters = search.length > 0 || sourceFilter !== "All"

  return (
    <div className="agent-toolbar">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="service-search"
          type="search"
          placeholder="Search by label (/)"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-keyshortcuts="/"
          className="h-8 rounded-lg bg-card pl-9 pr-8 shadow-sm"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X />
          </Button>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-1.5 md:justify-self-end">
        <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground xl:inline-flex">
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-sans">/</kbd>
          Search
          <span aria-hidden="true">·</span>
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-sans">R</kbd>
          Refresh
          <span aria-hidden="true">·</span>
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-sans">N</kbd>
          New
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-[9.5rem] justify-between bg-card"
              aria-label={`Source filter: ${selectedSource.label}`}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedSource.label}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Service source</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sourceFilter}
              onValueChange={(value) =>
                onSourceFilterChange(value as SourceFilter)
              }
            >
              {sourceOptions.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="items-start"
                >
                  <span>
                    <span className="block">{option.label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            onClick={() => {
              onSearchChange("")
              onSourceFilterChange("All")
            }}
            aria-label="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
