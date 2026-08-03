// PROTOTYPE — Variant B "Week bands": the month as week cards, each with its own worked/target/±
// and the balance it left behind. Day tiles are vertical hour columns. Delete with the directory.
import { useState } from 'react'
import type { MonthRepository } from '../../infra/repositories/types'
import type { MonthView } from '../../shared/useMonthView'
import { formatHours, formatHoursCompact } from '../../shared/formatHours'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { deriveProtoDays, groupByWeek, protoCategories, totalsFor, type ProtoDay } from './protoRows'
import { colorForCategory } from './catColors'
import { BalanceTrend } from './BalanceTrend'
import { DayDetailDialog } from './DayDetailDialog'

const COLUMN_SCALE = 10

function deltaClass(value: number): string {
  if (value > 0.01) return 'text-emerald-600 dark:text-emerald-400'
  if (value < -0.01) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
}

function DayTile({
  day,
  categories,
  timeFormat,
  onOpen,
}: {
  day: ProtoDay
  categories: string[]
  timeFormat: TimeFormat
  onOpen: () => void
}) {
  const dim = day.isNonWork && day.isEmpty
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex flex-col items-stretch gap-1 rounded-lg border px-2 pb-2 pt-1.5 text-left transition-colors hover:border-indigo-400 ${
        day.isToday
          ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
          : 'border-gray-200 dark:border-gray-700'
      } ${dim ? 'opacity-45' : ''}`}
      aria-label={`${day.date} — ${STATUS_LABEL[day.status]}`}
    >
      <span className="flex items-center justify-between">
        <span className="font-mono text-xs">
          <span className={day.isToday ? 'font-bold' : ''}>{day.dayNum}</span>
          <span className="ml-1 text-gray-400 dark:text-gray-500">{day.weekday}</span>
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[day.status]}`} />
      </span>

      <span className="relative flex h-24 items-end justify-center rounded bg-gray-100 dark:bg-gray-800">
        {day.target > 0 && (
          <span
            className="absolute left-0 right-0 border-t border-dashed border-gray-400/80 dark:border-gray-500"
            style={{ bottom: `${Math.min(100, (day.target / COLUMN_SCALE) * 100)}%` }}
          />
        )}
        <span className="flex w-6 flex-col-reverse overflow-hidden rounded-sm">
          {day.categories.map((slice) => (
            <span
              key={slice.cat}
              className={colorForCategory(slice.cat, categories).bar}
              style={{ height: `${Math.min(100, (slice.hours / COLUMN_SCALE) * 96)}px` }}
              title={`${slice.cat} — ${formatHours(slice.hours, timeFormat)}`}
            />
          ))}
          {day.unaccounted > 0.001 && (
            <span
              className="bg-gray-300 dark:bg-gray-600"
              style={{ height: `${Math.min(100, (day.unaccounted / COLUMN_SCALE) * 96)}px` }}
              title={`Unaccounted — ${formatHours(day.unaccounted, timeFormat)}`}
            />
          )}
        </span>
      </span>

      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium tabular-nums">
          {day.worked > 0.001 ? formatHoursCompact(day.worked, timeFormat) : '–'}
        </span>
        <span className={`text-[11px] tabular-nums ${day.delta === null ? '' : deltaClass(day.delta)}`}>
          {day.delta === null || dim || Math.abs(day.delta) < 0.01
            ? ''
            : `${day.delta > 0 ? '+' : ''}${formatHoursCompact(day.delta, timeFormat)}`}
        </span>
      </span>
      {day.note && <span className="truncate text-[10px] text-gray-500 dark:text-gray-400">📝 {day.note}</span>}
    </button>
  )
}

export function VariantB({ view, repository }: { view: MonthView; repository: MonthRepository }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const days = deriveProtoDays(view)
  const categories = protoCategories(view)
  const weeks = groupByWeek(days)
  const monthTotals = totalsFor(days)
  const [openDate, setOpenDate] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="mb-1 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Balance over the month</p>
          <p
            className={`text-lg font-semibold tabular-nums ${
              monthTotals.cumulative === null ? '' : deltaClass(monthTotals.cumulative)
            }`}
          >
            {monthTotals.cumulative === null
              ? '—'
              : `${monthTotals.cumulative > 0 ? '+' : ''}${formatHours(monthTotals.cumulative, timeFormat)}`}
          </p>
        </div>
        <BalanceTrend days={days} />
      </div>

      {weeks.map((week) => {
        const totals = totalsFor(week.days)
        const leadingPad = (new Date((week.days[0]?.date ?? '') + 'T12:00').getDay() + 6) % 7
        return (
          <div key={week.label} className="rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
              <p className="text-sm font-semibold">{week.label}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="tabular-nums">
                  <span className="text-gray-500 dark:text-gray-400">worked </span>
                  {formatHours(totals.worked, timeFormat)}
                </span>
                <span className="tabular-nums text-gray-500 dark:text-gray-400">
                  target {formatHours(totals.target, timeFormat)}
                </span>
                <span className={`font-medium tabular-nums ${deltaClass(totals.delta)}`}>
                  {totals.delta > 0 ? '+' : ''}
                  {formatHours(totals.delta, timeFormat)} week
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
                    totals.cumulative === null ? '' : deltaClass(totals.cumulative)
                  } bg-gray-100 dark:bg-gray-800`}
                >
                  {totals.cumulative === null
                    ? '—'
                    : `${totals.cumulative > 0 ? '+' : ''}${formatHours(totals.cumulative, timeFormat)} total`}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 p-3">
              {Array.from({ length: leadingPad }, (_, i) => (
                <div key={`pad-${String(i)}`} />
              ))}
              {week.days.map((day) => (
                <DayTile
                  key={day.date}
                  day={day}
                  categories={categories}
                  timeFormat={timeFormat}
                  onOpen={() => setOpenDate(day.date)}
                />
              ))}
            </div>
            {totals.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                {totals.categories.map((slice) => {
                  const color = colorForCategory(slice.cat, categories)
                  return (
                    <span
                      key={slice.cat}
                      className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${color.chip} ${color.text}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                      {slice.cat}
                      <span className="tabular-nums opacity-70">{formatHoursCompact(slice.hours, timeFormat)}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <DayDetailDialog date={openDate} view={view} repository={repository} onClose={() => setOpenDate(null)} />
    </div>
  )
}
