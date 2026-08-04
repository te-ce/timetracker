// PROTOTYPE — Variant C "Rail + workspace": scannable day rail on the left, the selected day's
// full tracking surface on the right, no dialogs. Delete with the directory.
import { useState } from 'react'
import type { MonthRepository } from '../../infra/repositories/types'
import type { MonthView } from '../../shared/useMonthView'
import { formatHours, formatHoursCompact } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { STATUS_BADGE, STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import { DayTimeline } from '../../features/day/DayTimeline'
import { resolveAutoCategory } from '../../shared/autoCategory'
import { deriveProtoDays, protoCategories, totalsFor, type ProtoDay } from './protoRows'
import { colorForCategory } from './catColors'
import { BalanceTrend } from './BalanceTrend'

function deltaClass(value: number): string {
  if (value > 0.01) return 'text-emerald-600 dark:text-emerald-400'
  if (value < -0.01) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
}

function DeltaBar({ delta, scale }: { delta: number; scale: number }) {
  const width = Math.min(50, (Math.abs(delta) / scale) * 50)
  const positive = delta > 0
  return (
    <span className="relative block h-1.5 w-full rounded bg-gray-100 dark:bg-gray-800">
      <span className="absolute inset-y-0 left-1/2 w-px bg-gray-300 dark:bg-gray-600" />
      <span
        className={`absolute inset-y-0 rounded ${positive ? 'bg-emerald-500' : 'bg-red-400'}`}
        style={positive ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
      />
    </span>
  )
}

function RailRow({ day, selected, onSelect }: { day: ProtoDay; selected: boolean; onSelect: () => void }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const dim = day.isNonWork && day.isEmpty
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-l-2 px-3 py-1.5 text-left ${
        selected
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'
      } ${dim ? 'opacity-45' : ''}`}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${day.date} — ${STATUS_LABEL[day.status]}`}
    >
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[day.status]}`} />
        <span className="font-mono text-xs">
          <span className={day.isToday ? 'font-bold' : ''}>{day.dayNum}</span>
          <span className="ml-1 text-gray-400 dark:text-gray-500">{day.weekday}</span>
        </span>
        <span className="ml-auto text-xs tabular-nums">
          {day.worked > 0.001 ? formatHoursCompact(day.worked, timeFormat) : ''}
        </span>
        <span
          className={`w-12 text-right text-xs font-semibold tabular-nums ${
            day.cumulative === null ? '' : deltaClass(day.cumulative)
          }`}
        >
          {day.cumulative === null
            ? ''
            : `${day.cumulative > 0 ? '+' : ''}${formatHoursCompact(day.cumulative, timeFormat)}`}
        </span>
      </span>
      {day.delta !== null && !dim && (
        <span className="mt-1 block">
          <DeltaBar delta={day.delta} scale={4} />
        </span>
      )}
    </button>
  )
}

export function VariantC({ view, repository }: { view: MonthView; repository: MonthRepository }) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const days = deriveProtoDays(view)
  const categories = protoCategories(view)
  const totals = totalsFor(days)
  const [selectedDate, setSelectedDate] = useState(view.todayIso)
  const selected = days.find((d) => d.date === selectedDate) ?? days[0]
  const { monthData, config } = view

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <div className="flex max-h-[75vh] flex-col rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Day · worked · balance</p>
        </div>
        <div className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
          {days.map((day) => (
            <RailRow
              key={day.date}
              day={day}
              selected={day.date === selected?.date}
              onSelect={() => setSelectedDate(day.date)}
            />
          ))}
        </div>
        <div className="border-t border-gray-100 px-3 py-2 text-xs dark:border-gray-800">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Month worked</span>
            <span className="tabular-nums">{formatHours(totals.worked, timeFormat)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Balance</span>
            <span
              className={`font-semibold tabular-nums ${totals.cumulative === null ? '' : deltaClass(totals.cumulative)}`}
            >
              {totals.cumulative === null
                ? '—'
                : `${totals.cumulative > 0 ? '+' : ''}${formatHours(totals.cumulative, timeFormat)}`}
            </span>
          </div>
        </div>
      </div>

      {selected && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {new Date(selected.date + 'T12:00').toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${
                    STATUS_BADGE[selected.status].bg
                  } ${STATUS_BADGE[selected.status].text}`}
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[selected.status]}`} />
                  {STATUS_LABEL[selected.status]}
                </span>
                <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">{selected.reason}</span>
              </div>
              <div className="flex gap-5 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Worked</p>
                  <p className="font-medium tabular-nums">{formatHours(selected.worked, timeFormat)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Target</p>
                  <p className="font-medium tabular-nums">{formatHours(selected.target, timeFormat)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Day ±</p>
                  <p
                    className={`font-medium tabular-nums ${selected.delta === null ? '' : deltaClass(selected.delta)}`}
                  >
                    {selected.delta === null
                      ? '—'
                      : `${selected.delta > 0 ? '+' : ''}${formatHours(selected.delta, timeFormat)}`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Balance to here
                  </p>
                  <p
                    className={`font-semibold tabular-nums ${
                      selected.cumulative === null ? '' : deltaClass(selected.cumulative)
                    }`}
                  >
                    {selected.cumulative === null
                      ? '—'
                      : `${selected.cumulative > 0 ? '+' : ''}${formatHours(selected.cumulative, timeFormat)}`}
                  </p>
                </div>
              </div>
            </div>

            {selected.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.categories.map((slice) => {
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
            {selected.note && (
              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-500 dark:text-gray-400">📝 {selected.note}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <DayTimeline
              date={selected.date}
              windows={monthData[selected.date]?.windows ?? []}
              repository={repository}
              autoCategory={resolveAutoCategory(monthData[selected.date]?.autoCategoryOverride, config.autoCategory)}
              customCategories={config.customCategories}
              categoryOrder={config.categoryOrder}
              categoryDescriptions={config.categoryDescriptions}
            />
          </div>

          <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Balance across the month
            </p>
            <BalanceTrend days={days} />
          </div>
        </div>
      )}
    </div>
  )
}
