import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { balanceInk, formatSignedHours } from '../month/monthBalanceFormat'
import { useAllTimeStats } from './useAllTimeStats'
import { buildFunFacts } from './funFacts'
import { StatBarList, type StatBarRow } from './StatBarList'
import { formatClock, type AllTimeStats } from './allTimeStats'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { RecordsSection } from './RecordsSection'
import { HeadlineCard } from './HeadlineCard'

function usualDayDetail(stats: AllTimeStats, format: TimeFormat): string {
  if (stats.avgStartMinutes === null || stats.avgEndMinutes === null)
    return `Median ${formatHours(stats.extremes.medianDayHours, format)}`
  return `Usually ${formatClock(stats.avgStartMinutes)} → ${formatClock(stats.avgEndMinutes)}`
}

function weekdayRows(stats: AllTimeStats, format: TimeFormat): StatBarRow[] {
  const max = Math.max(...stats.weekdays.map((w) => w.hours), 0)
  return stats.weekdays
    .filter((w) => w.trackedDays > 0)
    .map((w) => ({
      key: w.label,
      label: w.label,
      value: formatHours(w.hours, format),
      fillPercent: max > 0 ? (w.hours / max) * 100 : 0,
    }))
}

function categoryRows(stats: AllTimeStats, format: TimeFormat): StatBarRow[] {
  const max = stats.categories[0]?.hours ?? 0
  return stats.categories.map((c) => ({
    key: c.category,
    label: c.category,
    value: `${formatHours(c.hours, format)} · ${Math.round(c.percent)}%`,
    fillPercent: max > 0 ? (c.hours / max) * 100 : 0,
  }))
}

function monthRows(stats: AllTimeStats, format: TimeFormat): StatBarRow[] {
  const max = Math.max(...stats.months.map((m) => m.hours), 0)
  return [...stats.months].reverse().map((m) => ({
    key: m.ym,
    label: m.label,
    value: formatHours(m.hours, format),
    fillPercent: max > 0 ? (m.hours / max) * 100 : 0,
    subLabel: `${m.officePercent}% office · ${m.topCategory ?? 'No category'}`,
  }))
}

export function StatsView() {
  const { stats, isPending } = useAllTimeStats()
  const timeFormat = useTimeFormatStore((s) => s.format)
  const facts = buildFunFacts(stats, timeFormat)

  if (isPending) {
    return (
      <p role="status" className="text-sm text-gray-500 dark:text-gray-400">
        Crunching your tracked time…
      </p>
    )
  }

  if (!stats.hasData) {
    return (
      <section
        aria-label="All-time statistics"
        className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h1 className="text-lg font-semibold">Nothing to crunch yet</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track a few days and this page fills up with all-time totals, records and fun facts.
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="All-time statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeadlineCard
          label="Total tracked"
          value={formatHours(stats.totalHours, timeFormat)}
          detail={`${stats.trackedDays} day${stats.trackedDays === 1 ? '' : 's'} across ${stats.monthsTracked} month${stats.monthsTracked === 1 ? '' : 's'}`}
        />
        <HeadlineCard
          label="All-time balance"
          value={formatSignedHours(stats.balance, timeFormat)}
          valueClass={balanceInk(stats.balance)}
          detail="Worked minus target, tracked days only"
        />
        <HeadlineCard
          label="Average day"
          value={formatHours(stats.avgHoursPerTrackedDay, timeFormat)}
          detail={usualDayDetail(stats, timeFormat)}
        />
        <HeadlineCard
          label="Longest workday streak"
          value={`${stats.longestStreak?.length ?? 0}`}
          detail="Workdays in a row — broken by a vacation or sick day"
        />
      </section>

      <RecordsSection stats={stats} format={timeFormat} />

      <div className="grid gap-4 lg:grid-cols-2">
        <StatBarList
          title="Hours by weekday"
          rows={weekdayRows(stats, timeFormat)}
          emptyMessage="No tracked days yet."
        />
        <StatBarList
          title="Hours by category"
          rows={categoryRows(stats, timeFormat)}
          emptyMessage="No categorised hours yet."
        />
      </div>

      <StatBarList title="Hours by month" rows={monthRows(stats, timeFormat)} emptyMessage="No tracked months yet." />

      <section aria-label="Fun facts" className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fun facts</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {facts.map((fact) => (
            <li key={fact.id} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true">{fact.icon}</span>
              <span className="text-gray-700 dark:text-gray-300">{fact.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
