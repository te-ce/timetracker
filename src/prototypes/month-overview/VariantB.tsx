// PROTOTYPE — Variant B "Overview Rail": no calendar at all. A sticky rail carries the
// month's aggregates (balance, target progress, category mix, what needs attention); the
// main column is a scannable week-grouped list of days.
import { MonthNav } from '../../features/month/MonthNav'
import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { balanceInk, formatSigned, type PrototypeDay, type PrototypeModel } from './monthPrototypeModel'

interface Props {
  model: PrototypeModel
  onSelectDate: (date: string) => void
  onMonthChange: (year: number, month: number) => void
}

export function VariantB({ model, onSelectDate, onMonthChange }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)

  return (
    <div className="flex flex-col gap-4">
      <MonthNav year={model.year} month={model.month - 1} onMonthChange={onMonthChange} />

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-fit lg:w-72">
          <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Over/undertime, all time</p>
            <p className={`text-3xl font-bold tabular-nums ${balanceInk(model.cumulativeBalance)}`}>
              {formatSigned(model.cumulativeBalance, timeFormat)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formatSigned(model.monthBalance, timeFormat)} of it earned in {model.monthLabel.split(' ')[0]}
            </p>
          </section>

          <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Worked vs. month target</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {formatHours(model.worked, timeFormat)}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {' '}
                / {formatHours(model.targetFullMonth, timeFormat)}
              </span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{
                  width: `${model.targetFullMonth > 0 ? Math.min(100, (model.worked / model.targetFullMonth) * 100) : 0}%`,
                }}
                aria-hidden="true"
              />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
              <dt className="text-gray-500 dark:text-gray-400">Office days</dt>
              <dd className="text-right font-medium tabular-nums">
                {model.office.officeDays}/{model.office.totalWorkDays} ({model.office.officePercent}%)
              </dd>
              <dt className="text-gray-500 dark:text-gray-400">Leave days</dt>
              <dd className="text-right font-medium tabular-nums">{model.leaveDays.length}</dd>
              <dt className="text-gray-500 dark:text-gray-400">Unconfirmed</dt>
              <dd className="text-right font-medium tabular-nums">{model.unconfirmed.length}</dd>
            </dl>
          </section>

          {model.categories.length > 0 && (
            <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Where the month went</p>
              <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
                {model.categories.map((c) => (
                  <div key={c.name} className={`h-3 ${c.bg}`} style={{ width: `${c.percent}%` }} />
                ))}
              </div>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs">
                {model.categories.map((c) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${c.bg}`} aria-hidden="true" />
                    <span className="truncate text-gray-700 dark:text-gray-300">{c.name}</span>
                    <span className="ml-auto shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                      {formatHours(c.hours, timeFormat)} · {Math.round(c.percent)}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <AttentionList model={model} onSelectDate={onSelectDate} timeFormat={timeFormat} />
        </aside>

        <div className="min-w-0 flex-1 flex flex-col gap-4">
          {model.weeks.map((week) => (
            <section key={week.key}>
              <header className="flex items-baseline justify-between border-b px-1 pb-1 dark:border-gray-700">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  KW {week.isoWeek}
                </h3>
                <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  {formatHours(week.worked, timeFormat)} worked ·{' '}
                  <span className={balanceInk(week.balance)}>{formatSigned(week.balance, timeFormat)}</span>
                </p>
              </header>
              <ul>
                {week.days.map((day) => (
                  <DayRow key={day.date} day={day} model={model} onSelectDate={onSelectDate} timeFormat={timeFormat} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttentionList({
  model,
  onSelectDate,
  timeFormat,
}: {
  model: PrototypeModel
  onSelectDate: (date: string) => void
  timeFormat: TimeFormat
}) {
  const items = [
    ...model.needsReview.map((d) => ({ day: d, why: d.statusReason || 'Needs review' })),
    ...model.untrackedPast.map((d) => ({ day: d, why: `Nothing tracked · ${formatHours(d.targetHours, timeFormat)}` })),
  ].sort((a, b) => a.day.date.localeCompare(b.day.date))

  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        Nothing needs attention in this month.
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Needs attention · {items.length} day{items.length === 1 ? '' : 's'}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map(({ day, why }) => (
          <li key={day.date}>
            <button
              type="button"
              onClick={() => onSelectDate(day.date)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[day.displayStatus]}`} aria-hidden="true" />
              <span className="w-14 shrink-0 font-medium">
                {day.weekdayShort} {day.dayOfMonth}
              </span>
              <span className="truncate text-gray-500 dark:text-gray-400">{why}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DayRow({
  day,
  model,
  onSelectDate,
  timeFormat,
}: {
  day: PrototypeDay
  model: PrototypeModel
  onSelectDate: (date: string) => void
  timeFormat: TimeFormat
}) {
  const slices = Object.entries(day.categoryBreakdown).filter(([, h]) => h > 0.005)
  const barScale = model.maxDayHours

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectDate(day.date)}
        className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${day.isToday ? 'bg-orange-50 dark:bg-orange-900/20' : ''} ${day.dayType !== 'WorkDay' ? 'opacity-60' : ''}`}
      >
        <span className="w-16 shrink-0 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{day.weekdayShort} </span>
          <span className={`font-semibold ${day.isToday ? 'text-orange-600 dark:text-orange-400' : ''}`}>
            {day.dayOfMonth}
          </span>
        </span>

        <span
          className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[day.displayStatus]}`}
          title={STATUS_LABEL[day.displayStatus]}
          aria-hidden="true"
        />

        {/* one axis: hours, scaled to the month's longest day. Target tick sits on the same scale. */}
        <span className="relative h-3 min-w-0 flex-1 rounded bg-gray-100 dark:bg-gray-700/60">
          {day.targetHours > 0 && (
            <span
              className="absolute top-[-2px] h-4 w-px bg-gray-400 dark:bg-gray-500"
              style={{ left: `${(day.targetHours / barScale) * 100}%` }}
              aria-hidden="true"
            />
          )}
          <span className="flex h-3 gap-[2px] overflow-hidden rounded" aria-hidden="true">
            {slices.map(([cat, hours]) => (
              <span
                key={cat}
                className={`h-3 ${model.categoryBgOf[cat] ?? 'bg-slate-400'}`}
                style={{ width: `${(hours / barScale) * 100}%` }}
                title={`${cat}: ${formatHours(hours, timeFormat)}`}
              />
            ))}
          </span>
        </span>

        <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums">
          {day.workedHours > 0 ? formatHours(day.workedHours, timeFormat) : '–'}
        </span>
        <span
          className={`w-16 shrink-0 text-right text-xs tabular-nums ${day.balance !== null ? balanceInk(day.balance) : 'text-gray-300 dark:text-gray-600'}`}
        >
          {day.balance !== null ? formatSigned(day.balance, timeFormat) : ''}
        </span>
        <span className="w-8 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500">
          {day.note && <span title={day.note}>✎</span>}
          {day.location === 'Office' && <span title="Office">⌂</span>}
          {day.isConfirmed && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
        </span>
      </button>
    </li>
  )
}
