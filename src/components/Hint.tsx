import type { ReactElement } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type HintProps = {
  label: string
  description: string
  disabled?: boolean
  children: ReactElement
}

export function Hint({
  label,
  description,
  disabled = false,
  children,
}: HintProps) {
  const trigger = disabled ? (
    <span
      className="inline-flex"
      tabIndex={0}
      aria-label={`${label}. ${description}`}
    >
      {children}
    </span>
  ) : (
    children
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={7}
        className="max-w-72 border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-white shadow-lg dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900"
      >
        <p className="font-semibold">{label}</p>
        <p className="mt-0.5 leading-relaxed opacity-80">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}
