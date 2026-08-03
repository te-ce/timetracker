// PROTOTYPE — Variant A "Balance Ledger": one row per day, hours as a bar against target,
// running balance as the loudest number on the row. Delete with the directory.
import { useState } from 'react'
import type { MonthRepository } from '../../infra/repositories/types'
import type { MonthView } from '../../shared/useMonthView'
import { formatHours, formatHoursCompact } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { deriveProtoDays, protoCategories, totalsFor, type ProtoDay } from './protoRows'
import { colorForCategory } from './catColors'
import { DayDetailDialog } from './DayDetailDialog'

function scaleFor(days: ProtoDay[]): number {
  const max = days.reduce((m, d) => Math.max(m, d.worked, d.target), 8)
  return Math.ceil(max)
}

function balanceClass(value: number): string {
  if (value > 0.01) return 'text-emerald-600 dark:text-emerald-400'
  if (value < -0.01) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
}

export function VariantA({ view, repository }: { view: MonthView; repository: MonthRepository }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const days = deriveProtoDays(view)
  const categories = protoCategories(view)
  const scale = scaleFor(days)
  const totals = totalsFor(days)
  const [openDate, setOpenDate] = useState<string | null>(null)

  const trackedDays = days.filter((d) => !d.isFuture && !d.isNonWork)
  const currentBalance = totals.cumulative

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Balance today</p>
          <p className={`text-3xl font-semibold tabular-nums ${balanceClass(currentBalance ?? 0)}`}>
            {currentBalance === null
              ? '—'
              : `${currentBalance > 0 ? '+' : ''}${formatHours(currentBalance, timeFormat)}`}
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Worked</p>
            <p className="font-medium tabular-nums">{formatHours(totals.worked, timeFormat)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Target so far</p>
            <p className="font-medium tabular-nums">{formatHours(totals.target, timeFormat)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Days tracked</p>
            <p className="font-medium tabular-nums">{trackedDays.filter((d) => !d.isEmpty).length}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
        <div className="grid grid-cols-[5.5rem_0.75rem_1fr_4rem_4rem_5rem] items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span>Day</span>
          <span />
          <span>Hours vs target</span>
          <span className="text-right">Worked</span>
          <span className="text-right">Day ±</span>
          <span className="text-right">Balance</span>
        </div>
        {days.map((day) => {
          const dim = day.isNonWork && day.isEmpty
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setOpenDate(day.date)}
              className={`grid w-full grid-cols-[5.5rem_0.75rem_1fr_4rem_4rem_5rem] items-center gap-3 px-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                dim ? 'py-1 opacity-45' : 'py-2'
              } ${day.isToday ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-inset ring-amber-400' : ''}`}
              aria-label={`${day.date} — ${STATUS_LABEL[day.status]}`}
            >
              <span className="flex items-baseline gap-1.5 font-mono text-sm">
                <span className={day.isToday ? 'font-bold' : ''}>{day.dayNum}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{day.weekday}</span>
              </span>
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[day.status]}`} title={STATUS_LABEL[day.status]} />
              <span className="relative block h-5">
                {day.target > 0 && (
                  <span
                    className="absolute top-0 bottom-0 w-px bg-gray-400/70 dark:bg-gray-500"
                    style={{ left: `${(day.target / scale) * 100}%` }}
                  />
                )}
                <span className="absolute inset-y-1 left-0 right-0 rounded bg-gray-100 dark:bg-gray-800" />
                <span className="absolute inset-y-1 left-0 flex overflow-hidden rounded" style={{ right: 0 }}>
                  {day.categories.map((slice) => (
                    <span
                      key={slice.cat}
                      className={colorForCategory(slice.cat, categories).bar}
                      style={{ width: `${(slice.hours / scale) * 100}%` }}
                      title={`${slice.cat} — ${formatHours(slice.hours, timeFormat)}`}
                    />
                  ))}
                  {day.unaccounted > 0.001 && (
                    <span
                      className="bg-gray-300 dark:bg-gray-600"
                      style={{ width: `${(day.unaccounted / scale) * 100}%` }}
                      title={`Unaccounted — ${formatHours(day.unaccounted, timeFormat)}`}
                    />
                  )}
                </span>
              </span>
              <span className="text-right text-sm tabular-nums">
                {day.worked > 0.001 ? formatHoursCompact(day.worked, timeFormat) : ''}
              </span>
              <span className={`text-right text-xs tabular-nums ${day.delta === null ? '' : balanceClass(day.delta)}`}>
                {day.delta === null || Math.abs(day.delta) < 0.01 || (day.isNonWork && day.isEmpty)
                  ? ''
                  : `${day.delta > 0 ? '+' : ''}${formatHoursCompact(day.delta, timeFormat)}`}
              </span>
              <span
                className={`text-right text-sm font-semibold tabular-nums ${
                  day.cumulative === null ? '' : balanceClass(day.cumulative)
                }`}
              >
                {day.cumulative === null
                  ? ''
                  : `${day.cumulative > 0 ? '+' : ''}${formatHoursCompact(day.cumulative, timeFormat)}`}
              </span>
            </button>
          )
        })}
      </div>

      <DayDetailDialog date={openDate} view={view} repository={repository} onClose={() => setOpenDate(null)} />
    </div>
  )
}
