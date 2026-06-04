import { toLocalIso } from '../domain/dateUtils'
import type { DayStatus } from '../domain/dayStatus'
import { STATUS_CELL, STATUS_DOT, STATUS_LABEL, TODAY_DOT } from '../domain/statusColors'
import type { DisplayStatus } from '../domain/statusColors'
import { StatusLegend } from './StatusLegend'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  onMonthChange?: (year: number, month: number) => void
  dayStatusMap?: Record<string, DayStatus>
  dayDisplayStatusMap?: Record<string, DisplayStatus>
  dayStatusReasonMap?: Record<string, string>
  dayNoteMap?: Record<string, string>
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

function buildDots(status: DayStatus, displayStatus: DisplayStatus | undefined): string[] {
  if (status === 'today') {
    return displayStatus ? [TODAY_DOT, STATUS_DOT[displayStatus]] : [TODAY_DOT]
  }
  return [STATUS_DOT[status]]
}

export function MonthCalendar({
  year,
  month,
  onSelectDate,
  onMonthChange,
  dayStatusMap = {},
  dayDisplayStatusMap = {},
  dayStatusReasonMap = {},
  dayNoteMap = {},
}: Props) {
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
          const note = dayNoteMap[iso]
          const label = date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          const displayStatus = dayDisplayStatusMap[iso]
          const dots = buildDots(status, displayStatus)
          return (
            <div key={date.getDate()} className="group relative">
              <button
                onClick={() => onSelectDate(iso)}
                aria-label={label}
                aria-current={isToday ? 'date' : undefined}
                className={`relative w-full rounded-lg px-2 pb-3 pt-2 text-center text-sm ${STATUS_CELL[status]} border transition-colors${status === 'today' ? ' ring-2 ring-orange-400 dark:ring-orange-500' : ''}`}
              >
                {date.getDate()}
                {displayStatus === 'confirmed' && (
                  <span
                    className="absolute top-0.5 right-1 text-[9px] font-bold leading-none text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
                <span className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5" aria-hidden="true">
                  {dots.map((cls, i) => (
                    <span key={i} className={`h-1 w-1 rounded-full ${cls}`} />
                  ))}
                </span>
              </button>
              {(reason || note) && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max max-w-52 -translate-x-1/2 group-hover:block">
                  <div className="rounded bg-gray-800 dark:bg-gray-700 px-2.5 py-2 text-xs text-white shadow-lg">
                    {reason && (
                      <>
                        <p className="font-semibold">{STATUS_NAME[status]}</p>
                        <p className="mt-0.5 text-gray-300">{reason}</p>
                      </>
                    )}
                    {note && (
                      <p
                        className={`whitespace-pre-wrap text-gray-200 ${reason ? 'mt-1.5 border-t border-gray-600 pt-1.5' : ''}`}
                      >
                        {note}
                      </p>
                    )}
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
