import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { OvertimeBar } from '../components/OvertimeBar'
import { useMonthQuery } from '../hooks/useMonthQuery'
import type { DayStatus } from '../domain/dayStatus'

export function MonthView() {
  const navigate = useNavigate()
  const { year, month } = useSearch({ from: '/' })

  function onSelectDate(date: string) {
    void navigate({ to: '/day', search: { date } })
  }

  function onMonthChange(y: number, m: number) {
    void navigate({ to: '/', search: { year: y, month: m + 1 } })
  }

  const { summaries, overtimeToDate, officeDays, officePercent, trackedWorkDays, sollstunden } =
    useMonthQuery(year, month)

  const dayStatusMap: Record<string, DayStatus> = {}
  const dayStatusReasonMap: Record<string, string> = {}
  for (const day of summaries.days) {
    dayStatusMap[day.date] = day.displayStatus
    dayStatusReasonMap[day.date] = day.statusReason
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthCalendar
        year={year}
        month={month - 1}
        onSelectDate={onSelectDate}
        onMonthChange={onMonthChange}
        dayStatusMap={dayStatusMap}
        dayStatusReasonMap={dayStatusReasonMap}
      />
      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
        officeDays={officeDays}
        totalWorkDays={trackedWorkDays.length}
        officePercent={officePercent}
      />
    </div>
  )
}
