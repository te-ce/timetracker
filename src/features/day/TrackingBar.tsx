import type { ActiveTracking } from './dayStreamModel'
import { NotTrackingRow } from './NotTrackingRow'
import { ActiveTrackingRow } from './ActiveTrackingRow'
import { LogPastWorkRow } from './LogPastWorkRow'

interface TrackingBarProps {
  active: ActiveTracking | undefined
  now: string
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  /** False for a day that is over: live tracking gives way to writing the period down. */
  isToday: boolean
  onStart: (category: string, startTime: string) => void
  onAddPeriod: (start: string, end: string, category: string) => void
  onStop: (stopTime: string) => void
  onStartSubtask: (category: string, startTime: string) => void
  onStopSubtask: (stopTime: string) => void
}

export function TrackingBar({
  active,
  now,
  categories,
  defaultCategory,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  isToday,
  onStart,
  onAddPeriod,
  onStop,
  onStartSubtask,
  onStopSubtask,
}: TrackingBarProps) {
  if (active) {
    return (
      <ActiveTrackingRow
        active={active}
        now={now}
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        onStop={onStop}
        onStartSubtask={onStartSubtask}
        onStopSubtask={onStopSubtask}
      />
    )
  }

  if (!isToday) {
    return (
      <LogPastWorkRow
        categories={categories}
        defaultCategory={defaultCategory}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        onAddPeriod={onAddPeriod}
      />
    )
  }

  return (
    <NotTrackingRow
      now={now}
      categories={categories}
      defaultCategory={defaultCategory}
      categoryDescriptions={categoryDescriptions}
      preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      onStart={onStart}
    />
  )
}
