import { toLocalIso } from '../domain/dateUtils'
import type { DayStatus } from '../domain/dayStatus'
import { STATUS_CELL, STATUS_LABEL } from '../domain/statusColors'
import { StatusLegend } from './StatusLegend'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  onMonthChange?: (year: number, month: number) => void
  dayStatusMap?: Record<string, DayStatus>
  dayStatusReasonMap?: Record<string, string>
}

const STATUS_NAME: Record<DayStatus, string> = {
  ...STATUS_LABEL,
  today: 'Today',
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const count = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= count; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

export function MonthCalendar({ year, month, onSelectDate, onMonthChange, dayStatusMap = {}, dayStatusReasonMap = {} }: Props) {
  const days = getDaysInMonth(year, month)
  const now = new Date()
  const todayIso = toLocalIso(now)
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  function handlePrev() {
    if (!onMonthChange) return
    if (month === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, month - 1)
  }

  function handleNext() {
    if (!onMonthChange) return
    if (month === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, month + 1)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous month"
          onClick={handlePrev}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            aria-label="Current month"
            onClick={() => {
              const now = new Date()
              onMonthChange?.(now.getFullYear(), now.getMonth())
            }}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${isCurrentMonth ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'}`}
            aria-disabled={year === new Date().getFullYear() && month === new Date().getMonth()}
          >
            Today
          </button>
        </div>
        <button
          aria-label="Next month"
          onClick={handleNext}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}

        {/* Leading empty cells for alignment */}
        {Array.from({ length: ((days[0]?.getDay() ?? 0) + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((date) => {
          const iso = toLocalIso(date)
          const status = dayStatusMap[iso] ?? 'future'
          const isToday = iso === todayIso
          const reason = dayStatusReasonMap[iso]
          const label = date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          return (
            <div key={date.getDate()} className="group relative">
              <button
                onClick={() => onSelectDate(iso)}
                aria-label={label}
                aria-current={isToday ? 'date' : undefined}
                className={`relative w-full rounded-lg px-2 py-2 text-center text-sm ${STATUS_CELL[status]} border transition-colors`}
              >
                {date.getDate()}
                {isToday && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${status === 'confirmed' ? 'bg-white' : 'bg-emerald-700'}`}
                    aria-hidden="true"
                  />
                )}
              </button>
              {reason && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max max-w-52 -translate-x-1/2 group-hover:block">
                  <div className="rounded bg-gray-800 dark:bg-gray-700 px-2.5 py-2 text-xs text-white shadow-lg">
                    <p className="font-semibold">{STATUS_NAME[status]}</p>
                    <p className="mt-0.5 text-gray-300">{reason}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <StatusLegend />
    </div>
  )
}
