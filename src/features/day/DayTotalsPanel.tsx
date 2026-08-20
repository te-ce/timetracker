import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { DayBalance } from '../../shared/dayBalance'
import { categoryDisplay } from './categoryLabel'
import type { DayStats } from './dayStreamModel'
import { BalanceRows } from './BalanceRows'

interface Props {
  stats: DayStats
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  /** When present, renders the target/overtime/required/remaining block below the worked-today figure. */
  balance?: DayBalance | undefined
  isLoading?: boolean | undefined
}

interface ProjectedTotals {
  isProjected: boolean
  worked: number
  atDesk: number
}

/** Once a planned stop exists, the worked/at-desk figures shown reflect the projected total rather than the elapsed one — matching the projection the remaining-hours row already uses. */
function projectedTotals(stats: DayStats, balance: DayBalance | undefined): ProjectedTotals {
  if (!balance?.hasPlannedStop) return { isProjected: false, worked: stats.worked, atDesk: stats.atDesk }
  return { isProjected: true, worked: balance.projectedWorked, atDesk: balance.projectedWorked + stats.breakHours }
}

/** The numbers the day is judged by, kept on screen next to the timeline. */
export function DayTotalsPanel({
  stats,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  balance,
  isLoading = false,
}: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const largest = Math.max(0.01, ...stats.categoryTotals.map((t) => t.hours))
  const { isProjected, worked: displayWorked, atDesk: displayAtDesk } = projectedTotals(stats, balance)

  return (
    <aside aria-label="Day totals" className="w-56 shrink-0">
      <div className="sticky top-2 flex flex-col gap-3 rounded-lg border p-3 dark:border-gray-700">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Worked today{isProjected && <span className="text-blue-500 dark:text-blue-400"> · projected</span>}
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-gray-800 dark:text-gray-100">
            {formatHours(displayWorked, timeFormat)}
          </p>
          {balance && <BalanceRows balance={balance} isLoading={isLoading} timeFormat={timeFormat} />}
        </div>

        <ul className="flex flex-col gap-1.5">
          {stats.categoryTotals.map((total) => (
            <li key={total.category} className="text-xs">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {
                    categoryDisplay(
                      total.category,
                      categoryDescriptions ?? {},
                      preferCategoryDescriptionAsPrimary ?? false,
                    ).primary
                  }
                </span>
                <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
                  {formatHours(total.hours, timeFormat)}
                </span>
              </span>
              <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <span
                  className="block h-full rounded-full bg-indigo-500"
                  style={{ width: `${(total.hours / largest) * 100}%` }}
                />
              </span>
            </li>
          ))}
          {stats.categoryTotals.length === 0 && (
            <li className="text-xs text-gray-400 dark:text-gray-500">nothing tracked yet</li>
          )}
        </ul>

        <dl className="flex flex-col gap-0.5 border-t pt-2 text-xs dark:border-gray-700">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">started</dt>
            <dd className="font-mono tabular-nums">{stats.firstStart ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">{stats.runningSince ? 'running since' : 'last stop'}</dt>
            <dd className="font-mono tabular-nums">{stats.runningSince ?? stats.lastStop ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">breaks</dt>
            <dd className="font-mono tabular-nums">
              {stats.breakCount > 0 ? `${stats.breakCount} · ${formatHours(stats.breakHours, timeFormat)}` : 'none'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">at desk</dt>
            <dd className="font-mono tabular-nums">{formatHours(displayAtDesk, timeFormat)}</dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}
