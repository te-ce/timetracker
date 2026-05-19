import { classifyDay } from '../domain/dayType'
import type { DayType } from '../domain/dayType'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  onMonthChange?: (year: number, month: number) => void
}

const DAY_TYPE_COLORS: Record<DayType, string> = {
  WorkDay: 'bg-white hover:bg-gray-50',
  Weekend: 'bg-gray-100 text-gray-400',
  PublicHoliday: 'bg-amber-50 text-amber-700',
  Vacation: 'bg-sky-50 text-sky-700',
  SickDay: 'bg-red-50 text-red-700',
  Absence: 'bg-purple-50 text-purple-700',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const count = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= count; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function MonthCalendar({ year, month, onSelectDate, onMonthChange }: Props) {
  const days = getDaysInMonth(year, month)

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
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
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
          const dayType = classifyDay(date)
          return (
            <button
              key={date.getDate()}
              onClick={() => onSelectDate(toIso(date))}
              className={`rounded-lg px-2 py-2 text-center text-sm ${DAY_TYPE_COLORS[dayType]} border transition-colors`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
