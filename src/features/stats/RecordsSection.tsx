import { formatClock } from './allTimeStats'
import { HeadlineCard } from './HeadlineCard'
import { formatHours } from '../../shared/formatHours'
import { formatFactDate, formatMinutes } from './funFacts'
import { type AllTimeStats } from './allTimeStats'
import type { TimeFormat } from '../../shared/timeFormatStore'

export function RecordsSection({ stats, format }: { stats: AllTimeStats; format: TimeFormat }) {
  return (
    <section aria-label="Records" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <HeadlineCard
        label="Office share"
        value={`${stats.location.officePercent}%`}
        detail={`${stats.location.officeDays} of ${stats.trackedDays} tracked days`}
      />
      <HeadlineCard
        label="Longest day"
        value={stats.longestDay ? formatHours(stats.longestDay.hours, format) : '—'}
        detail={stats.longestDay ? formatFactDate(stats.longestDay.date) : undefined}
      />
      <HeadlineCard
        label="Shortest day"
        value={stats.shortestTrackedDay ? formatHours(stats.shortestTrackedDay.hours, format) : '—'}
        detail={stats.shortestTrackedDay ? formatFactDate(stats.shortestTrackedDay.date) : undefined}
      />
      <HeadlineCard
        label="Typical break"
        value={formatMinutes(stats.breaks.avgMinutesPerDay)}
        detail={usualBreakDetail(stats)}
      />
    </section>
  )
}

/** When the main break of a day usually falls, e.g. "Usually 12:10 → 12:45". */
function usualBreakDetail(stats: AllTimeStats): string {
  const { usualStartMinutes, usualEndMinutes } = stats.breaks
  if (usualStartMinutes === null || usualEndMinutes === null) return 'Between periods on a tracked day'
  return `Usually ${formatClock(usualStartMinutes)} → ${formatClock(usualEndMinutes)}`
}
