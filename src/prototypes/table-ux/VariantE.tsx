// PROTOTYPE — Variant E "Transposed matrix": days across the top, categories down the side, so a
// whole month fits one screen-width and any two days are neighbouring columns. Delete with the dir.
import type { MonthView } from '../../shared/useMonthView'
import { formatHoursCompact } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { deriveProtoDays, protoCategories, totalsFor } from './protoRows'
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

const LABEL = 'sticky left-0 z-10 bg-white dark:bg-gray-900 px-1.5 text-left text-[10px]'
const CELL = 'w-9 min-w-[2.2rem] px-0.5 text-center text-[9px] tabular-nums'

export function VariantE({ view }: { view: MonthView }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const days = deriveProtoDays(view)
  const categories = protoCategories(view)
  const maxima = categoryMaxima(days, categories)
  const balScale = balanceScale(days)
  const monthTotals = totalsFor(days)

  function num(value: number): string {
    return value > 0.001 ? formatHoursCompact(value, timeFormat) : ''
  }

  function dimClass(dateIdx: number): string {
    const day = days[dateIdx]
    if (!day) return ''
    if (day.isToday) return 'bg-amber-50 dark:bg-amber-900/20'
    if (day.isNonWork && day.isEmpty) return 'opacity-45'
    return ''
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Read a column for one day, a row to compare a category across the month. Cell shade = size within its row.
      </p>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className={`${LABEL} py-1 uppercase tracking-wide text-gray-500 dark:text-gray-400`}>Day</th>
              {days.map((day, i) => (
                <th key={day.date} className={`${CELL} py-1 font-mono ${dimClass(i)}`}>
                  <span className={day.isToday ? 'font-bold' : ''}>{day.dayNum}</span>
                  <span className="block text-[9px] font-normal text-gray-400 dark:text-gray-500">
                    {day.weekday.slice(0, 2)}
                  </span>
                </th>
              ))}
              <th className="w-14 min-w-[3.5rem] border-l border-gray-300 px-1 py-1 text-right text-[10px] uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className={`${LABEL} py-[3px] text-gray-500 dark:text-gray-400`}>status</td>
              {days.map((day, i) => (
                <td
                  key={day.date}
                  className={`${CELL} py-[3px] ${dimClass(i)}`}
                  title={`${STATUS_LABEL[day.status]} — ${day.reason}`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[day.status]}`} />
                </td>
              ))}
              <td className="border-l border-gray-300 dark:border-gray-600" />
            </tr>

            {categories.map((cat) => {
              const color = colorForCategory(cat, categories)
              const rowTotal = monthTotals.categories.find((c) => c.cat === cat)?.hours ?? 0
              return (
                <tr
                  key={cat}
                  className={`border-b border-gray-100 dark:border-gray-800 ${rowTotal < 0.001 ? 'opacity-35' : ''}`}
                >
                  <td className={`${LABEL} py-[3px] ${color.text}`} title={cat}>
                    <span className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`} />
                      {shortCat(cat)}
                    </span>
                  </td>
                  {days.map((day, i) => {
                    const hours = hoursFor(day, cat)
                    return (
                      <td
                        key={day.date}
                        className={`${CELL} py-[3px] ${dimClass(i)}`}
                        style={heatStyle(cat, hours, maxima[cat] ?? 0, categories)}
                      >
                        {num(hours)}
                      </td>
                    )
                  })}
                  <td className="border-l border-gray-300 px-1 py-[3px] text-right text-[10px] font-medium tabular-nums dark:border-gray-600">
                    {num(rowTotal)}
                  </td>
                </tr>
              )
            })}

            <tr className="border-t-2 border-gray-400 dark:border-gray-500">
              <td className={`${LABEL} py-[3px] font-semibold`}>worked</td>
              {days.map((day, i) => (
                <td
                  key={day.date}
                  className={`${CELL} py-[3px] font-semibold ${dimClass(i)}`}
                  style={workedBarStyle(day.worked, day.target)}
                >
                  {num(day.worked)}
                </td>
              ))}
              <td className="border-l border-gray-300 px-1 py-[3px] text-right text-[10px] font-semibold tabular-nums dark:border-gray-600">
                {num(monthTotals.worked)}
              </td>
            </tr>

            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className={`${LABEL} py-[3px] text-gray-500 dark:text-gray-400`}>day ±</td>
              {days.map((day, i) => {
                const dim = day.isNonWork && day.isEmpty
                return (
                  <td
                    key={day.date}
                    className={`${CELL} py-[3px] ${day.delta === null ? '' : deltaClass(day.delta)} ${dimClass(i)}`}
                  >
                    {day.delta === null || dim || Math.abs(day.delta) < 0.01
                      ? ''
                      : `${day.delta > 0 ? '+' : ''}${formatHoursCompact(day.delta, timeFormat)}`}
                  </td>
                )
              })}
              <td
                className={`border-l border-gray-300 px-1 py-[3px] text-right text-[10px] tabular-nums dark:border-gray-600 ${deltaClass(monthTotals.delta)}`}
              >
                {monthTotals.delta > 0 ? '+' : ''}
                {formatHoursCompact(monthTotals.delta, timeFormat)}
              </td>
            </tr>

            <tr>
              <td className={`${LABEL} py-[3px] font-semibold`}>balance</td>
              {days.map((day, i) => (
                <td
                  key={day.date}
                  className={`${CELL} py-[3px] font-semibold ${day.cumulative === null ? '' : deltaClass(day.cumulative)} ${dimClass(i)}`}
                  style={day.cumulative === null ? {} : balanceBarStyle(day.cumulative, balScale)}
                >
                  {day.cumulative === null
                    ? ''
                    : `${day.cumulative > 0 ? '+' : ''}${formatHoursCompact(day.cumulative, timeFormat)}`}
                </td>
              ))}
              <td className="border-l border-gray-300 dark:border-gray-600" />
            </tr>

            <tr className="border-t border-gray-100 dark:border-gray-800">
              <td className={`${LABEL} py-[3px] text-gray-500 dark:text-gray-400`}>loc · note</td>
              {days.map((day, i) => (
                <td key={day.date} className={`${CELL} py-[3px] ${dimClass(i)}`} title={day.note ?? ''}>
                  <span className="block leading-tight">{day.location === 'Office' ? '🏢' : '🏠'}</span>
                  <span className="block leading-tight">{day.note ? '📝' : ''}</span>
                </td>
              ))}
              <td className="border-l border-gray-300 dark:border-gray-600" />
            </tr>
          </tbody>
        </table>
      </div>

      {days.some((d) => d.note) && (
        <ul className="flex flex-col gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          {days
            .filter((d) => d.note)
            .map((d) => (
              <li key={d.date}>
                <span className="font-mono">{d.dayNum}</span> — {d.note}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
