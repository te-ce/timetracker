import type { ReactNode } from 'react'

/** Says why a time range can't be saved: a WorkPeriod never ends at or before it starts. */
export function InvalidRangeHint({ children }: { children: ReactNode }) {
  return (
    <span role="alert" className="text-xs text-red-600 dark:text-red-400">
      {children}
    </span>
  )
}
