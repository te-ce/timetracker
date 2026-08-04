// PROTOTYPE — Variant D "Heat grid": the full day × category matrix, every number printed, cells
// shaded by size so the month is comparable at a glance. Delete with the directory.
import { Fragment } from 'react'
import type { MonthView } from '../../shared/useMonthView'
import { formatHoursCompact } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { deriveProtoDays, groupByWeek, protoCategories, totalsFor, type ProtoDay } from './protoRows'
import { colorForCategory } from './catColors'
import {
  balanceBarStyle,
  balanceScale,
  categoryMaxima,
  deltaClass,
  heatStyle,
  hoursFor,
  shortCat,
  workedBarStyle,
} from './denseHelpers'

const STICKY = 'sticky bg-white dark:bg-gray-900'

export function VariantD({ view }: { view: MonthView }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const days = deriveProtoDays(view)
  const categories = protoCategories(view)
  const maxima = categoryMaxima(days, categories)
  const balScale = balanceScale(days)
  const weeks = groupByWeek(days)
  const monthTotals = totalsFor(days)

  function num(value: number): string {
    return value > 0.001 ? formatHoursCompact(value, timeFormat) : ''
  }

  function dayRow(day: ProtoDay) {
    const dim = day.isNonWork && day.isEmpty
    return (
      <tr
        key={day.date}
        className={`border-b border-gray-100 dark:border-gray-800 ${
          day.isToday ? 'bg-amber-50 dark:bg-amber-900/20' : ''
        } ${dim ? 'opacity-50' : ''}`}
      >
        <td className={`${STICKY} left-0 z-10 px-1.5 py-[3px] font-mono text-[11px] ${day.isToday ? 'font-bold' : ''}`}>
          {day.dayNum}
          <span className="ml-1 text-gray-400 dark:text-gray-500">{day.weekday}</span>
        </td>
        <td
          className={`${STICKY} left-[3.6rem] z-10 px-1 py-[3px]`}
          title={`${STATUS_LABEL[day.status]} — ${day.reason}`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[day.status]}`} />
        </td>
        <td
          className={`${STICKY} left-[4.6rem] z-10 w-14 px-1.5 py-[3px] text-right text-[11px] tabular-nums`}
          style={workedBarStyle(day.worked, day.target)}
        >
          {num(day.worked)}
        </td>
        <td
          className={`w-12 px-1.5 py-[3px] text-right text-[11px] tabular-nums ${day.delta === null ? '' : deltaClass(day.delta)}`}
        >
          {day.delta === null || dim || Math.abs(day.delta) < 0.01
            ? ''
            : `${day.delta > 0 ? '+' : ''}${formatHoursCompact(day.delta, timeFormat)}`}
        </td>
        <td
          className={`w-16 border-r border-gray-200 px-1.5 py-[3px] text-right text-[11px] font-semibold tabular-nums dark:border-gray-700 ${
            day.cumulative === null ? '' : deltaClass(day.cumulative)
          }`}
          style={day.cumulative === null ? {} : balanceBarStyle(day.cumulative, balScale)}
        >
          {day.cumulative === null
            ? ''
            : `${day.cumulative > 0 ? '+' : ''}${formatHoursCompact(day.cumulative, timeFormat)}`}
        </td>
        {categories.map((cat) => {
          const hours = hoursFor(day, cat)
          return (
            <td
              key={cat}
              className="w-12 px-1 py-[3px] text-right text-[11px] tabular-nums"
              style={heatStyle(cat, hours, maxima[cat] ?? 0, categories)}
            >
              {num(hours)}
            </td>
          )
        })}
        <td
          className="w-6 border-l border-gray-200 px-1 py-[3px] text-center text-[10px] dark:border-gray-700"
          title={day.location}
        >
          {day.location === 'Office' ? '🏢' : '🏠'}
        </td>
        <td
          className="max-w-[14rem] truncate px-1.5 py-[3px] text-[10px] text-gray-500 dark:text-gray-400"
          title={day.note ?? ''}
        >
          {day.note ?? ''}
        </td>
      </tr>
    )
  }

  function subtotalRow(label: string, subset: ProtoDay[]) {
    const totals = totalsFor(subset)
    return (
      <tr className="border-b border-gray-300 bg-gray-50 text-[10px] font-medium dark:border-gray-600 dark:bg-gray-800/70">
        <td className={`${STICKY} left-0 z-10 bg-gray-50 px-1.5 py-[2px] dark:bg-gray-800/70`} colSpan={2}>
          {label}
        </td>
        <td
          className={`${STICKY} left-[4.6rem] z-10 bg-gray-50 px-1.5 py-[2px] text-right tabular-nums dark:bg-gray-800/70`}
        >
          {num(totals.worked)}
        </td>
        <td className={`px-1.5 py-[2px] text-right tabular-nums ${deltaClass(totals.delta)}`}>
          {totals.delta > 0 ? '+' : ''}
          {formatHoursCompact(totals.delta, timeFormat)}
        </td>
        <td className="border-r border-gray-200 dark:border-gray-700" />
        {categories.map((cat) => (
          <td key={cat} className="px-1 py-[2px] text-right tabular-nums">
            {num(totals.categories.find((c) => c.cat === cat)?.hours ?? 0)}
          </td>
        ))}
        <td className="border-l border-gray-200 dark:border-gray-700" />
        <td colSpan={1} />
      </tr>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="text-gray-500 dark:text-gray-400">
          worked{' '}
          <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
            {formatHoursCompact(monthTotals.worked, timeFormat)}
          </span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          target{' '}
          <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
            {formatHoursCompact(monthTotals.target, timeFormat)}
          </span>
        </span>
        <span
          className={`font-semibold tabular-nums ${monthTotals.cumulative === null ? '' : deltaClass(monthTotals.cumulative)}`}
        >
          balance{' '}
          {monthTotals.cumulative === null
            ? '—'
            : `${monthTotals.cumulative > 0 ? '+' : ''}${formatHoursCompact(monthTotals.cumulative, timeFormat)}`}
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          cell shade = size of that entry relative to the month's biggest in the same category
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white dark:bg-gray-900">
            <tr className="border-b border-gray-300 text-[10px] uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
              <th className={`${STICKY} left-0 z-30 px-1.5 py-1 text-left`}>Day</th>
              <th className={`${STICKY} left-[3.6rem] z-30 px-1 py-1`}>
                <span className="sr-only">Status</span>
              </th>
              <th className={`${STICKY} left-[4.6rem] z-30 px-1.5 py-1 text-right`}>Work</th>
              <th className="px-1.5 py-1 text-right">Day ±</th>
              <th className="border-r border-gray-200 px-1.5 py-1 text-right dark:border-gray-700">Balance</th>
              {categories.map((cat) => {
                const color = colorForCategory(cat, categories)
                return (
                  <th key={cat} className="px-1 py-1 text-right align-bottom" title={cat}>
                    <span className={`block truncate ${color.text}`} style={{ maxWidth: '3rem' }}>
                      {shortCat(cat)}
                    </span>
                  </th>
                )
              })}
              <th className="border-l border-gray-200 px-1 py-1 dark:border-gray-700">
                <span aria-hidden="true">📍</span>
              </th>
              <th className="px-1.5 py-1 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <Fragment key={week.label}>
                {week.days.map(dayRow)}
                {subtotalRow(`week ${week.label}`, week.days)}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-white dark:bg-gray-900">
            <tr className="border-t-2 border-gray-400 text-[11px] font-semibold dark:border-gray-500">
              <td className={`${STICKY} left-0 z-10 px-1.5 py-1`} colSpan={2}>
                Month
              </td>
              <td className={`${STICKY} left-[4.6rem] z-10 px-1.5 py-1 text-right tabular-nums`}>
                {num(monthTotals.worked)}
              </td>
              <td className={`px-1.5 py-1 text-right tabular-nums ${deltaClass(monthTotals.delta)}`}>
                {monthTotals.delta > 0 ? '+' : ''}
                {formatHoursCompact(monthTotals.delta, timeFormat)}
              </td>
              <td className="border-r border-gray-200 dark:border-gray-700" />
              {categories.map((cat) => (
                <td key={cat} className="px-1 py-1 text-right tabular-nums">
                  {num(monthTotals.categories.find((c) => c.cat === cat)?.hours ?? 0)}
                </td>
              ))}
              <td className="border-l border-gray-200 dark:border-gray-700" />
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
