import { toLocalIso } from '../../shared/dateUtils'
import { useTodayIso } from '../../shared/useTodayIso'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'
import type { DaySummaryData } from '../../shared/DaySummaryBody'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { isoWeekOf } from '../../shared/isoWeek'
import type { MonthOverview, MonthOverviewDay, MonthOverviewWeek } from './monthOverview'
import type { WorkLocation } from '../../infra/repositories/types'

interface Props {
  year: number
  month: number // 0-indexed
  onSelectDate: (isoDate: string) => void
  dayStatusMap?: Record<string, DayStatus>
  dayDisplayStatusMap?: Record<string, DisplayStatus>
  daySummaryDataMap?: Record<string, DaySummaryData>
  dayNoteMap?: Record<string, string>
  dayLocationMap?: Record<string, WorkLocation>
  /** Hours, target and balance per day plus week totals — the numbers shown in the cells. */
  overview?: MonthOverview
}

import { DayCell } from './DayCell'
import { WeekTotalCell } from './WeekTotalCell'

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const count = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= count; d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

/** Calendar rows, Monday-aligned — the first row is padded out to the 1st's weekday. */
function toCalendarRows(days: Date[]): Date[][] {
  const rows: Date[][] = []
  let row: Date[] = []
  for (const date of days) {
    if (row.length > 0 && (date.getDay() + 6) % 7 === 0) {
      rows.push(row)
      row = []
    }
    row.push(date)
  }
  if (row.length > 0) rows.push(row)
  return rows
}

export function MonthCalendar({
  year,
  month,
  onSelectDate,
  dayStatusMap = {},
  dayDisplayStatusMap = {},
  daySummaryDataMap = {},
  dayNoteMap = {},
  dayLocationMap = {},
  overview,
}: Props) {
  const rows = toCalendarRows(getDaysInMonth(year, month))
  const todayIso = useTodayIso()
  const timeFormat = useTimeFormatStore((s) => s.format)

  const ledgerByDate = new Map<string, MonthOverviewDay>()
  const weekByIsoWeek = new Map<number, MonthOverviewWeek>()
  for (const week of overview?.weeks ?? []) {
    weekByIsoWeek.set(week.isoWeek, week)
    for (const day of week.days) ledgerByDate.set(day.date, day)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-8 gap-1">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}
        <div className="py-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500">Week</div>
      </div>

      {rows.map((row) => {
        const firstDate = row[0]
        if (!firstDate) return null
        const leadingPad = (firstDate.getDay() + 6) % 7
        const week = weekByIsoWeek.get(isoWeekOf(toLocalIso(firstDate)))

        return (
          <div key={toLocalIso(firstDate)} className="grid grid-cols-8 gap-1">
            {Array.from({ length: leadingPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {row.map((date) => {
              const iso = toLocalIso(date)
              return (
                <DayCell
                  key={iso}
                  iso={iso}
                  date={date}
                  isToday={iso === todayIso}
                  status={dayStatusMap[iso] ?? 'future'}
                  displayStatus={dayDisplayStatusMap[iso]}
                  summaryData={daySummaryDataMap[iso]}
                  note={dayNoteMap[iso]}
                  location={dayLocationMap[iso]}
                  ledger={ledgerByDate.get(iso)}
                  timeFormat={timeFormat}
                  onSelectDate={onSelectDate}
                />
              )
            })}

            {Array.from({ length: 7 - leadingPad - row.length }).map((_, i) => (
              <div key={`tail-${i}`} />
            ))}

            {week ? <WeekTotalCell week={week} timeFormat={timeFormat} /> : <div />}
          </div>
        )
      })}
    </div>
  )
}
