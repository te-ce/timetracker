// PROTOTYPE — Variant C "Rhythm": drop the calendar and the list. The month is read as
// distribution and trend — hours per day, the balance curve, weekday rhythm, category mix —
// with one selected day peeking inline before you commit to opening it.
import { useState } from 'react'
import { MonthNav } from '../../features/month/MonthNav'
import { Tooltip } from '../../shared/Tooltip'
import { DaySummaryBody } from '../../shared/DaySummaryBody'
import { STATUS_LABEL } from '../../shared/statusColors'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { balanceInk, formatSigned, type PrototypeDay, type PrototypeModel } from './monthPrototypeModel'

interface Props {
  model: PrototypeModel
  onSelectDate: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

const BAR_FILL: Record<string, string> = {
  confirmed: 'bg-emerald-500',
  complete: 'bg-indigo-500',
  'needs-review': 'bg-red-400',
  untracked: 'bg-gray-200 dark:bg-gray-600',
  future: 'bg-gray-100 dark:bg-gray-700',
  leave: 'bg-purple-400',
  'non-working': 'bg-gray-100 dark:bg-gray-700',
}

const BAR_LEGEND = [
  { label: 'Complete', swatch: 'bg-indigo-500' },
  { label: 'Confirmed', swatch: 'bg-emerald-500' },
  { label: 'Needs review', swatch: 'bg-red-400' },
  { label: 'Leave', swatch: 'bg-purple-400' },
  { label: 'Untracked gap', swatch: 'border border-dashed border-red-300 bg-red-50 dark:border-red-800' },
] as const

export function VariantC({ model, onSelectDate, onMonthChange }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  // The month arrives after the first render, so the default selection has to follow the data
  // rather than being frozen by useState's initial value.
  const defaultSelected = model.today?.date ?? [...model.days].reverse().find((d) => d.workedHours > 0)?.date ?? null
  const [seenDefault, setSeenDefault] = useState(defaultSelected)
  const [selected, setSelected] = useState<string | null>(defaultSelected)
  if (defaultSelected !== seenDefault) {
    setSeenDefault(defaultSelected)
    setSelected(defaultSelected)
  }
  const selectedDay = model.days.find((d) => d.date === selected)
  const chartMax = Math.ceil(model.maxDayHours)

  return (
    <div className="flex flex-col gap-5">
      <MonthNav year={model.year} month={model.month - 1} onMonthChange={onMonthChange} />

      <section className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <Hero
          label="Over/undertime, all time"
          value={formatSigned(model.cumulativeBalance, timeFormat)}
          ink={balanceInk(model.cumulativeBalance)}
        />
        <Hero
          label={`Worked in ${model.monthLabel.split(' ')[0]}`}
          value={formatHours(model.worked, timeFormat)}
          sub={`of ${formatHours(model.targetFullMonth, timeFormat)} target`}
        />
        <Hero
          label="Days needing attention"
          value={`${model.needsReview.length + model.untrackedPast.length}`}
          sub={`${model.untrackedPast.length} untracked · ${model.needsReview.length} to review`}
        />
        <Hero label="Office share" value={`${model.office.officePercent}%`} sub={`${model.office.officeDays} days`} />
      </section>

      {/* Hours per day — one axis (hours), bars coloured by day status. */}
      <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Hours per day</h3>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            {BAR_LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-sm ${item.swatch}`} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-stretch gap-2">
          <div className="flex w-8 flex-col justify-between py-0 text-right text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
            <span>{chartMax}h</span>
            <span>0</span>
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              <div className="border-t border-gray-100 dark:border-gray-700" />
              <div className="border-t border-gray-100 dark:border-gray-700" />
              <div className="border-t border-gray-200 dark:border-gray-600" />
            </div>
            <div className="relative flex h-40 items-end gap-[2px]">
              {model.days.map((day) => (
                <DayBar
                  key={day.date}
                  day={day}
                  chartMax={chartMax}
                  timeFormat={timeFormat}
                  isSelected={day.date === selected}
                  onSelect={() => setSelected(day.date)}
                />
              ))}
            </div>
            <div className="mt-1 flex gap-[2px]">
              {model.days.map((day) => (
                <span
                  key={day.date}
                  className={`flex-1 text-center text-[9px] tabular-nums ${day.isToday ? 'font-bold text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  {day.dayOfMonth % 2 === 1 ? day.dayOfMonth : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BalanceTrend model={model} timeFormat={timeFormat} />

        <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-sm font-semibold">Weekday rhythm</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Average hours on tracked days</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {model.weekdayAverages.map((w) => (
              <li key={w.weekdayShort} className="flex items-center gap-2 text-xs">
                <span className="w-8 shrink-0 text-gray-500 dark:text-gray-400">{w.weekdayShort}</span>
                <span className="h-3 min-w-0 flex-1 rounded bg-gray-100 dark:bg-gray-700/60">
                  <span
                    className="block h-3 rounded bg-indigo-500"
                    style={{ width: `${(w.average / chartMax) * 100}%` }}
                    aria-hidden="true"
                  />
                </span>
                <span className="w-12 shrink-0 text-right tabular-nums">
                  {w.average > 0 ? formatHours(w.average, timeFormat) : '–'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {model.categories.length > 0 && (
          <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-semibold">Category mix</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {model.categories.map((c) => (
                <li key={c.name} className="text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="truncate font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                    <span className="tabular-nums text-gray-500 dark:text-gray-400">
                      {formatHours(c.hours, timeFormat)} · {Math.round(c.percent)}%
                    </span>
                  </div>
                  <span className="mt-1 block h-2 rounded bg-gray-100 dark:bg-gray-700/60">
                    <span
                      className={`block h-2 rounded ${c.bg}`}
                      style={{ width: `${c.percent}%` }}
                      aria-hidden="true"
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">
              {selectedDay
                ? `${selectedDay.weekdayShort} ${selectedDay.dayOfMonth} ${model.monthLabel.split(' ')[0]}`
                : 'Pick a day'}
            </h3>
            {selectedDay && (
              <button
                type="button"
                onClick={() => onSelectDate(selectedDay.date)}
                className="rounded border px-2 py-0.5 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Open day →
              </button>
            )}
          </div>
          <div className="mt-3">
            {selectedDay ? (
              <>
                <DaySummaryBody
                  displayStatus={selectedDay.displayStatus}
                  reason={selectedDay.statusReason}
                  workedHours={selectedDay.workedHours}
                  categoryBreakdown={selectedDay.categoryBreakdown}
                  {...(selectedDay.leaveType !== undefined ? { leaveType: selectedDay.leaveType } : {})}
                  {...(selectedDay.note !== undefined ? { note: selectedDay.note } : {})}
                  timeFormat={timeFormat}
                />
                <p className="mt-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  Target {formatHours(selectedDay.targetHours, timeFormat)}
                  {selectedDay.balance !== null && (
                    <>
                      {' · '}
                      <span className={balanceInk(selectedDay.balance)}>
                        {formatSigned(selectedDay.balance, timeFormat)}
                      </span>
                    </>
                  )}
                  {selectedDay.location ? ` · ${selectedDay.location}` : ''}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Click a bar above.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function DayBar({
  day,
  chartMax,
  timeFormat,
  isSelected,
  onSelect,
}: {
  day: PrototypeDay
  chartMax: number
  timeFormat: TimeFormat
  isSelected: boolean
  onSelect: () => void
}) {
  // A leave day books no WorkedHours but is not a gap — show it at its target height so the
  // month's shape doesn't have holes where vacation was.
  const barHours = day.workedHours > 0 ? day.workedHours : day.leaveType ? day.targetHours : 0
  const heightPercent = barHours > 0 ? Math.max(2, (barHours / chartMax) * 100) : 0
  const targetPercent = day.targetHours > 0 ? (day.targetHours / chartMax) * 100 : 0
  const fill = BAR_FILL[day.displayStatus] ?? 'bg-indigo-500'
  const isGap = day.displayStatus === 'untracked' && !day.isFuture

  return (
    <Tooltip
      content={
        <div className="text-xs">
          <p className="font-semibold">
            {day.weekdayShort} {day.dayOfMonth} — {STATUS_LABEL[day.displayStatus]}
          </p>
          <p>
            {formatHours(day.workedHours, timeFormat)} worked · target {formatHours(day.targetHours, timeFormat)}
          </p>
          {day.balance !== null && <p>{formatSigned(day.balance, timeFormat)}</p>}
        </div>
      }
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${day.weekdayShort} ${day.dayOfMonth}: ${formatHours(day.workedHours, timeFormat)}`}
        className={`relative flex h-40 flex-1 items-end rounded-sm ${day.isWeekend ? 'bg-gray-50 dark:bg-gray-900/40' : ''} ${isSelected ? 'ring-2 ring-orange-400' : ''}`}
      >
        {targetPercent > 0 && (
          <span
            className="absolute left-0 right-0 border-t border-dashed border-gray-300 dark:border-gray-600"
            style={{ bottom: `${targetPercent}%` }}
            aria-hidden="true"
          />
        )}
        {isGap && (
          <span
            className="absolute inset-x-0 bottom-0 rounded-t-[4px] border border-dashed border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
            style={{ height: `${targetPercent}%` }}
            aria-hidden="true"
          />
        )}
        <span className={`w-full rounded-t-[4px] ${fill}`} style={{ height: `${heightPercent}%` }} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}

function BalanceTrend({ model, timeFormat }: { model: PrototypeModel; timeFormat: TimeFormat }) {
  const points = model.days
    .map((d, i) => ({ i, value: d.accumulated }))
    .filter((p): p is { i: number; value: number } => p.value !== null)

  if (points.length < 2) {
    return (
      <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-semibold">Balance trend</h3>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Not enough tracked days yet.</p>
      </section>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const width = 100
  const height = 40
  const x = (i: number) => (i / Math.max(1, model.days.length - 1)) * width
  const y = (v: number) => height - ((v - min) / span) * height
  const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ')
  const last = points[points.length - 1]?.value ?? 0

  return (
    <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Balance trend</h3>
        <p className={`text-sm font-semibold tabular-nums ${balanceInk(last)}`}>{formatSigned(last, timeFormat)}</p>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Running over/undertime through the month</p>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-3 h-24 w-full" role="img">
        <title>Cumulative over/undertime per day</title>
        <line
          x1="0"
          x2={width}
          y1={y(0)}
          y2={y(0)}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-600"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          className="text-indigo-500"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
        {formatSigned(min, timeFormat)} … {formatSigned(max, timeFormat)}
      </p>
    </section>
  )
}

function Hero({ label, value, sub, ink }: { label: string; value: string; sub?: string; ink?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${ink ?? ''}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  )
}
