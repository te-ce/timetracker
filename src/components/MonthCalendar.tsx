import { toLocalIso } from '../domain/dateUtils'
import type { DayStatus } from '../domain/dayStatus'
import { StatusLegend } from './StatusLegend'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  onMonthChange?: (year: number, month: number) => void
  dayStatusMap?: Record<string, DayStatus>
  dayStatusReasonMap?: Record<string, string>
}

const STATUS_COLORS: Record<DayStatus, string> = {
  'non-working': 'bg-gray-100 text-gray-400',
  leave: 'bg-purple-100 text-purple-700',
  future: 'bg-white text-gray-600 hover:bg-gray-50',
  today: 'bg-white text-gray-900 hover:bg-gray-50',
  tracked: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  confirmed: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300',
  'needs-review': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  untracked: 'bg-blue-100 text-blue-700',
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
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
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
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity ${isCurrentMonth ? 'text-gray-400 opacity-40 cursor-default pointer-events-none' : 'text-orange-500 hover:bg-orange-50'}`}
            aria-disabled={year === new Date().getFullYear() && month === new Date().getMonth()}
          >
            Today
          </button>
        </div>
        <button
          aria-label="Next month"
          onClick={handleNext}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}

        {/* Leading empty cells for alignment */}
        {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((date) => {
          const iso = toLocalIso(date)
          const status = dayStatusMap[iso] ?? 'future'
          const isToday = status === 'today'
          const label = date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          return (
            <button
              key={date.getDate()}
              onClick={() => onSelectDate(iso)}
              aria-label={label}
              title={dayStatusReasonMap[iso]}
              aria-current={isToday ? 'date' : undefined}
              className={`relative rounded-lg px-2 py-2 text-center text-sm ${STATUS_COLORS[status]} border transition-colors`}
            >
              {date.getDate()}
              {isToday && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-700"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      <StatusLegend />
    </div>
  )
}
