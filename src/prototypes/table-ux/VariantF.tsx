// PROTOTYPE — Variant F "Ledger + aligned charts": every number stays on screen; the comparison
// work is done by a sparkline per category column and a balance curve running down the right edge,
// row-aligned with the days. Delete with the directory.
import type { MonthView } from '../../shared/useMonthView'
import { formatHoursCompact } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { deriveProtoDays, protoCategories, totalsFor, type ProtoDay } from './protoRows'
import { colorForCategory } from './catColors'
import { deltaClass, hoursFor, shortCat, workedBarStyle } from './denseHelpers'

const ROW_H = 20

function ColumnSparkline({ values, max, rgb }: { values: number[]; max: number; rgb: string }) {
  const width = values.length * 2
  return (
    <svg viewBox={`0 0 ${width} 12`} preserveAspectRatio="none" className="h-3 w-full" aria-hidden="true">
      {values.map((v, i) => {
        const h = max > 0 ? (v / max) * 12 : 0
        return <rect key={i} x={i * 2} y={12 - h} width={1.4} height={h} fill={`rgb(${rgb} / 0.85)`} />
      })}
    </svg>
  )
}

/** Balance curve drawn at exactly ROW_H per day so it lines up with the grid rows. */
function BalanceColumn({ days, width = 132 }: { days: ProtoDay[]; width?: number }) {
  const height = days.length * ROW_H
  const values = days.map((d) => d.cumulative)
  const known = values.filter((v): v is number => v !== null)
  const max = Math.max(1, ...known.map(Math.abs))
  const zeroX = width / 2
  const x = (v: number) => zeroX + (v / max) * (width / 2 - 6)
  const y = (i: number) => i * ROW_H + ROW_H / 2

  const pts = values.map((v, i) => (v === null ? null : { x: x(v), y: y(i) })).filter((p) => p !== null)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const first = pts[0]
  const last = pts[pts.length - 1]
  const area = first && last ? `${line} L${zeroX},${last.y.toFixed(1)} L${zeroX},${first.y.toFixed(1)} Z` : ''

  return (
    <svg width={width} height={height} className="shrink-0" role="img" aria-label="Running balance curve">
      <line x1={zeroX} x2={zeroX} y1={0} y2={height} className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={1} />
      {days.map((d, i) =>
        d.isToday ? (
          <rect key={d.date} x={0} y={i * ROW_H} width={width} height={ROW_H} className="fill-amber-200/40" />
        ) : null,
      )}
      {area && <path d={area} className="fill-indigo-500/15" />}
      <path d={line} fill="none" strokeWidth={1.5} className="stroke-indigo-500" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.6} className="fill-indigo-500" />
      ))}
    </svg>
  )
}

export function VariantF({ view }: { view: MonthView }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const days = deriveProtoDays(view)
  const categories = protoCategories(view)
  const monthTotals = totalsFor(days)

  function num(value: number): string {
    return value > 0.001 ? formatHoursCompact(value, timeFormat) : ''
  }

  const template = `3.4rem 0.75rem 3.2rem 2.8rem 3.4rem repeat(${categories.length}, minmax(2.6rem, 1fr)) 1.4rem`
  const cellBase = 'flex items-center justify-end px-1 text-[11px] tabular-nums'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 text-[11px]">
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
      </div>

      <div className="flex overflow-x-auto">
        <div className="min-w-0 flex-1">
          {/* header */}
          <div
            className="grid h-12 items-end border-b border-gray-300 pb-1 text-[10px] uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400"
            style={{ gridTemplateColumns: template }}
          >
            <span className="px-1">Day</span>
            <span />
            <span className="px-1 text-right">Work</span>
            <span className="px-1 text-right">±</span>
            <span className="px-1 text-right">Bal</span>
            {categories.map((cat) => {
              const color = colorForCategory(cat, categories)
              const values = days.map((d) => hoursFor(d, cat))
              const max = Math.max(0, ...values)
              const total = monthTotals.categories.find((c) => c.cat === cat)?.hours ?? 0
              return (
                <span
                  key={cat}
                  className={`flex flex-col gap-0.5 px-1 ${total < 0.001 ? 'opacity-35' : ''}`}
                  title={`${cat} — ${num(total)} this month, ${num(max)} biggest day`}
                >
                  <ColumnSparkline values={values} max={max} rgb={color.rgb} />
                  <span className={`truncate text-right ${color.text}`}>{shortCat(cat)}</span>
                  <span className="text-right tabular-nums text-gray-900 dark:text-gray-100">{num(total)}</span>
                </span>
              )
            })}
            <span className="text-center">📍</span>
          </div>

          {/* rows */}
          {days.map((day) => {
            const dim = day.isNonWork && day.isEmpty
            const weekEdge = new Date(day.date + 'T12:00').getDay() === 1
            return (
              <div
                key={day.date}
                className={`grid items-center ${weekEdge ? 'border-t border-gray-300 dark:border-gray-600' : ''} ${
                  day.isToday ? 'bg-amber-100/60 dark:bg-amber-900/25' : ''
                } ${dim ? 'opacity-45' : ''}`}
                style={{ gridTemplateColumns: template, height: `${ROW_H}px` }}
              >
                <span className={`px-1 font-mono text-[11px] ${day.isToday ? 'font-bold' : ''}`}>
                  {day.dayNum}
                  <span className="ml-1 text-gray-400 dark:text-gray-500">{day.weekday.slice(0, 2)}</span>
                </span>
                <span
                  className="flex items-center justify-center"
                  title={`${STATUS_LABEL[day.status]} — ${day.reason}`}
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[day.status]}`} />
                </span>
                <span className={cellBase} style={workedBarStyle(day.worked, day.target)}>
                  {num(day.worked)}
                </span>
                <span className={`${cellBase} ${day.delta === null ? '' : deltaClass(day.delta)}`}>
                  {day.delta === null || dim || Math.abs(day.delta) < 0.01
                    ? ''
                    : `${day.delta > 0 ? '+' : ''}${formatHoursCompact(day.delta, timeFormat)}`}
                </span>
                <span
                  className={`${cellBase} font-semibold ${day.cumulative === null ? '' : deltaClass(day.cumulative)}`}
                >
                  {day.cumulative === null
                    ? ''
                    : `${day.cumulative > 0 ? '+' : ''}${formatHoursCompact(day.cumulative, timeFormat)}`}
                </span>
                {categories.map((cat) => (
                  <span key={cat} className={cellBase}>
                    {num(hoursFor(day, cat))}
                  </span>
                ))}
                <span className="text-center text-[10px]" title={day.location}>
                  {day.location === 'Office' ? '🏢' : '🏠'}
                </span>
              </div>
            )
          })}

          {/* totals */}
          <div
            className="grid items-center border-t-2 border-gray-400 text-[11px] font-semibold tabular-nums dark:border-gray-500"
            style={{ gridTemplateColumns: template, height: `${ROW_H}px` }}
          >
            <span className="px-1">Σ</span>
            <span />
            <span className={cellBase}>{num(monthTotals.worked)}</span>
            <span className={`${cellBase} ${deltaClass(monthTotals.delta)}`}>
              {monthTotals.delta > 0 ? '+' : ''}
              {formatHoursCompact(monthTotals.delta, timeFormat)}
            </span>
            <span />
            {categories.map((cat) => (
              <span key={cat} className={cellBase}>
                {num(monthTotals.categories.find((c) => c.cat === cat)?.hours ?? 0)}
              </span>
            ))}
            <span />
          </div>
        </div>

        <div className="ml-3 shrink-0 border-l border-gray-200 pl-2 dark:border-gray-700">
          <div className="flex h-12 items-end border-b border-gray-300 pb-1 text-[10px] uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
            Balance curve
          </div>
          <BalanceColumn days={days} />
        </div>
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
