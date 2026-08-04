import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { balanceInk, formatSignedHours } from '../month/monthBalanceFormat'
import { useAllTimeStats } from './useAllTimeStats'
import { buildFunFacts, formatFactDate, formatMinutes } from './funFacts'
import { StatBarList, type StatBarRow } from './StatBarList'
import { formatClock, type AllTimeStats } from './allTimeStats'
import type { TimeFormat } from '../../shared/timeFormatStore'

function HeadlineCard({
  label,
  value,
  detail,
  valueClass,
}: {
  label: string
  value: string
  detail?: string | undefined
  valueClass?: string | undefined
}) {
  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass ?? ''}`}>{value}</p>
      {detail && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
    </div>
  )
}

/** "Usually 08:05 → 16:15" — the average tracked day's start and end. */
function usualDayDetail(stats: AllTimeStats): string {
  if (stats.avgStartMinutes === null || stats.avgEndMinutes === null) return 'Between periods on a tracked day'
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
      <section aria-label="All-time statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
          detail={`Median ${formatHours(stats.extremes.medianDayHours, timeFormat)}`}
        />
        <HeadlineCard
          label="Longest workday streak"
          value={`${stats.longestStreak?.length ?? 0}`}
          detail="Workdays in a row — broken by a vacation or sick day"
        />
        <HeadlineCard
          label="Office share"
          value={`${stats.location.officePercent}%`}
          detail={`${stats.location.officeDays} of ${stats.trackedDays} tracked days`}
        />
      </section>

      <section aria-label="Records" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeadlineCard
          label="Biggest week"
          value={stats.weeks.bestWeek ? formatHours(stats.weeks.bestWeek.hours, timeFormat) : '—'}
          detail={stats.weeks.bestWeek?.label}
        />
        <HeadlineCard
          label="Longest day"
          value={stats.longestDay ? formatHours(stats.longestDay.hours, timeFormat) : '—'}
          detail={stats.longestDay ? formatFactDate(stats.longestDay.date) : undefined}
        />
        <HeadlineCard
          label="Shortest day"
          value={stats.shortestTrackedDay ? formatHours(stats.shortestTrackedDay.hours, timeFormat) : '—'}
          detail={stats.shortestTrackedDay ? formatFactDate(stats.shortestTrackedDay.date) : undefined}
        />
        <HeadlineCard
          label="Typical break"
          value={formatMinutes(stats.breaks.avgMinutesPerDay)}
          detail={usualDayDetail(stats)}
        />
      </section>

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
