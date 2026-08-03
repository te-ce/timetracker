// PROTOTYPE — Variant A "Ledger Calendar": keep the calendar mental model, but put the
// numbers in the cells and add a week-total column, so nothing lives only in a tooltip.
import { MonthNav } from '../../features/month/MonthNav'
import { StatusLegend } from '../../features/month/StatusLegend'
import { STATUS_CELL } from '../../shared/statusColors'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { balanceInk, formatSigned, type PrototypeDay, type PrototypeModel } from './monthPrototypeModel'

interface Props {
  model: PrototypeModel
  onSelectDate: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

export function VariantA({ model, onSelectDate, onMonthChange }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const workedPercent = model.targetFullMonth > 0 ? (model.worked / model.targetFullMonth) * 100 : 0
  const targetToDatePercent =
    model.targetFullMonth > 0
      ? (model.days.filter((d) => !d.isFuture).reduce((s, d) => s + d.targetHours, 0) / model.targetFullMonth) * 100
      : 0
  const attention = [...model.needsReview, ...model.untrackedPast].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col gap-4">
      <MonthNav year={model.year} month={model.month - 1} onMonthChange={onMonthChange} />

      <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Worked this month</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatHours(model.worked, timeFormat)}
              <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                of {formatHours(model.targetFullMonth, timeFormat)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip label="Balance" value={formatSigned(model.cumulativeBalance, timeFormat)} tone="balance" />
            {model.needsReview.length > 0 && (
              <Chip label="Needs review" value={`${model.needsReview.length} d`} tone="bad" />
            )}
            {model.untrackedPast.length > 0 && (
              <Chip
                label="Untracked"
                value={`${model.untrackedPast.length} d · ${formatHours(model.missingHours, timeFormat)}`}
                tone="warn"
              />
            )}
            <Chip label="Office" value={`${model.office.officePercent}%`} tone="plain" />
          </div>
        </div>
        {/* single axis: % of the full-month target. The notch marks target-to-date. */}
        <div className="relative mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-2 rounded-full bg-indigo-500"
            style={{ width: `${Math.min(100, workedPercent)}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute top-[-3px] h-3.5 w-0.5 bg-gray-900 dark:bg-gray-100"
            style={{ left: `${Math.min(100, targetToDatePercent)}%` }}
            aria-hidden="true"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Notch = target up to today ({formatHours(model.targetTracked, timeFormat)} counted for tracked days)
        </p>
      </section>

      <div className="grid grid-cols-8 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
        <div className="py-1 text-gray-400 dark:text-gray-500">Week</div>
      </div>

      <div className="flex flex-col gap-1">
        {model.weeks.map((week) => {
          const offset = (week.days[0]?.weekday ?? 1) - 1
          return (
            <div key={week.key} className="grid grid-cols-8 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {week.days.map((day) => (
                <LedgerCell key={day.date} day={day} onSelectDate={onSelectDate} timeFormat={timeFormat} />
              ))}
              {Array.from({ length: 7 - offset - week.days.length }).map((_, i) => (
                <div key={`tail-${i}`} />
              ))}
              <div className="rounded-lg border border-dashed px-2 py-2 text-right dark:border-gray-700">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  KW {week.isoWeek}
                </p>
                <p className="text-sm font-semibold tabular-nums">{formatHours(week.worked, timeFormat)}</p>
                <p className={`text-xs tabular-nums ${balanceInk(week.balance)}`}>
                  {formatSigned(week.balance, timeFormat)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {attention.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="mb-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {attention.length} day{attention.length === 1 ? '' : 's'} need attention
          </p>
          <div className="flex flex-wrap gap-1.5">
            {attention.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className="rounded-full border bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-amber-900/40"
              >
                {day.weekdayShort} {day.dayOfMonth}
                <span className="ml-1.5 text-gray-500 dark:text-gray-400">
                  {day.displayStatus === 'untracked' ? 'nothing tracked' : day.statusReason || 'review'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <StatusLegend />
    </div>
  )
}

function LedgerCell({
  day,
  onSelectDate,
  timeFormat,
}: {
  day: PrototypeDay
  onSelectDate: (date: string) => void
  timeFormat: TimeFormat
}) {
  const fill = day.targetHours > 0 ? Math.min(100, (day.workedHours / day.targetHours) * 100) : 0
  const isQuiet = day.dayType !== 'WorkDay'

  return (
    <button
      type="button"
      onClick={() => onSelectDate(day.date)}
      aria-label={`${day.weekdayShort} ${day.dayOfMonth}`}
      className={`relative flex min-h-[72px] flex-col justify-between rounded-lg border px-2 py-1.5 text-left ${STATUS_CELL[day.dayStatus]}`}
    >
      <span className="flex items-baseline justify-between">
        <span
          className={`text-xs font-bold ${day.isToday ? 'rounded-full bg-orange-400 px-1.5 text-white dark:bg-orange-500' : ''}`}
        >
          {day.dayOfMonth}
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          {day.note && <span title={day.note}>✎</span>}
          {day.location === 'Office' && <span title="Office">⌂</span>}
          {day.isConfirmed && <span className="font-bold text-emerald-600 dark:text-emerald-400">✓</span>}
        </span>
      </span>

      {day.leaveType ? (
        <span className="text-xs font-medium">{day.leaveType === 'Vacation' ? 'Vacation' : 'Sick'}</span>
      ) : (
        <span className="text-base font-semibold tabular-nums leading-none">
          {day.workedHours > 0 ? formatHours(day.workedHours, timeFormat) : isQuiet ? '' : '–'}
        </span>
      )}

      <span className="mt-1 block">
        {!isQuiet && (
          <span className="block h-1 w-full rounded-full bg-black/10 dark:bg-white/10">
            <span className="block h-1 rounded-full bg-indigo-500" style={{ width: `${fill}%` }} aria-hidden="true" />
          </span>
        )}
        {day.balance !== null && (
          <span className={`mt-0.5 block text-[10px] tabular-nums ${balanceInk(day.balance)}`}>
            {formatSigned(day.balance, timeFormat)}
          </span>
        )}
      </span>
    </button>
  )
}

function Chip({ label, value, tone }: { label: string; value: string; tone: 'balance' | 'bad' | 'warn' | 'plain' }) {
  const toneCls = {
    balance: 'border-gray-300 dark:border-gray-600',
    bad: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300',
    warn: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    plain: 'border-gray-200 dark:border-gray-700',
  }[tone]
  return (
    <span className={`rounded-lg border px-2.5 py-1 text-xs ${toneCls}`}>
      <span className="text-gray-500 dark:text-gray-400">{label} </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  )
}
