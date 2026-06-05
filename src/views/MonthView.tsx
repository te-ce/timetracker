import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MonthNav } from '../components/MonthNav'
import { MonthCalendar } from '../components/MonthCalendar'
import { OvertimeBar } from '../components/OvertimeBar'
import { StatusLegend } from '../components/StatusLegend'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useMonthSummaries } from '../hooks/useMonthSummaries'
import { useRepositories } from '../repositories/RepositoryContext'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { DayStatus } from '../domain/dayStatus'
import type { DisplayStatus } from '../domain/statusColors'

export function MonthView() {
  const { monthRepo, timeTrackingRepo } = useRepositories()
  const navigate = useNavigate()
  const { year, month } = useSearch({ from: '/month' })

  function onSelectDate(date: string) {
    void navigate({ to: '/', search: { date } })
  }

  function onMonthChange(y: number, m: number) {
    void navigate({ to: '/month', search: { year: y, month: m + 1 } })
  }

  const queryClient = useQueryClient()
  const { data: activeTracking = null } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const resetMonthMutation = useMutation({
    mutationFn: () => monthRepo.deleteMonth(year, month),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) }),
  })

  const { summaries, overtimeToDate, workLocations, sollstunden, dayNotes } = useMonthSummaries(year, month)

  const trackedWorkDays = summaries.days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = trackedWorkDays.length > 0 ? Math.round((officeDays / trackedWorkDays.length) * 100) : 0

  const dayStatusMap: Record<string, DayStatus> = {}
  const dayDisplayStatusMap: Record<string, DisplayStatus> = {}
  const dayStatusReasonMap: Record<string, string> = {}
  for (const day of summaries.days) {
    dayStatusMap[day.date] = day.dayStatus
    dayDisplayStatusMap[day.date] = day.displayStatus
    dayStatusReasonMap[day.date] = day.statusReason
  }
  const dayNoteMap: Record<string, string> = Object.fromEntries(dayNotes)

  return (
    <div className="flex flex-col gap-6">
      <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} />
      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
        activeTrackingStartedAt={activeTracking?.startedAt}
        officeDays={officeDays}
        totalWorkDays={trackedWorkDays.length}
        officePercent={officePercent}
      />
      <div className="flex justify-end">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-xs font-medium text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
          aria-label="Reset all data for this month"
        >
          Reset all
        </button>
      </div>
      <MonthCalendar
        year={year}
        month={month - 1}
        onSelectDate={onSelectDate}
        dayStatusMap={dayStatusMap}
        dayDisplayStatusMap={dayDisplayStatusMap}
        dayStatusReasonMap={dayStatusReasonMap}
        dayNoteMap={dayNoteMap}
      />
      <StatusLegend />

      {showResetConfirm && (
        <ConfirmDialog
          title="Reset all data for this month?"
          message={`This will permanently delete all time entries, work periods, locations, day types, and confirmations for ${monthLabel}. This cannot be undone.`}
          confirmLabel="Reset month"
          danger
          onConfirm={() => {
            setShowResetConfirm(false)
            resetMonthMutation.mutate()
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  )
}
