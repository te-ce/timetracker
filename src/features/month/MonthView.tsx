import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MonthNav } from './MonthNav'
import { MonthCalendar } from './MonthCalendar'
import { OvertimeBar } from './OvertimeBar'
import { StatusLegend } from './StatusLegend'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { useMonthSummaries } from '../../shared/useMonthSummaries'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { QUERY_KEYS, invalidateConfig, invalidateMonthByYearMonth } from '../../shared/queryKeys'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'
import type { DaySummaryData } from '../../shared/DaySummaryBody'

export function MonthView() {
  const { monthRepo, configRepo, timeTrackingRepo } = useRepositories()
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
    onSuccess: () => invalidateMonthByYearMonth(queryClient, year, month),
  })

  const {
    config,
    summaries,
    overtimeToDate,
    workLocations,
    sollstunden,
    dayNotes,
    todayLiveWindowStart,
    todayPlannedStopTime,
  } = useMonthSummaries(year, month)

  const trackedWorkDays = summaries.days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = trackedWorkDays.length > 0 ? Math.round((officeDays / trackedWorkDays.length) * 100) : 0

  const dayStatusMap: Record<string, DayStatus> = {}
  const dayDisplayStatusMap: Record<string, DisplayStatus> = {}
  const daySummaryDataMap: Record<string, DaySummaryData> = {}
  for (const day of summaries.days) {
    dayStatusMap[day.date] = day.dayStatus
    dayDisplayStatusMap[day.date] = day.displayStatus
    daySummaryDataMap[day.date] = {
      displayStatus: day.displayStatus,
      reason: day.statusReason,
      workedHours: day.workedHours,
      categoryBreakdown: day.categoryBreakdown,
      ...(day.leaveType !== undefined ? { leaveType: day.leaveType } : {}),
      ...(config?.categoryDescriptions !== undefined ? { categoryDescriptions: config.categoryDescriptions } : {}),
    }
  }
  const dayNoteMap: Record<string, string> = Object.fromEntries(dayNotes)

  const showOvertimeBar = config?.showOvertimeBar !== false
  const showOfficeStats = config?.officeStats !== false
  const hideOvertimeMutation = useMutation({
    mutationFn: async () => {
      const cfg = await configRepo.get()
      await configRepo.save({ ...cfg, showOvertimeBar: false })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  return (
    <div className="flex flex-col gap-6">
      <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} />
      {showOvertimeBar && (
        <OvertimeBar
          sollstunden={sollstunden}
          priorOvertime={overtimeToDate.priorOvertime}
          workedToday={overtimeToDate.workedToday}
          activeTrackingStartedAt={activeTracking?.startedAt ?? null}
          liveWindowStart={todayLiveWindowStart ?? null}
          plannedStopTime={todayPlannedStopTime ?? null}
          {...(showOfficeStats ? { officeDays, totalWorkDays: trackedWorkDays.length, officePercent } : {})}
          onHide={() => hideOvertimeMutation.mutate()}
        />
      )}
      <MonthCalendar
        year={year}
        month={month - 1}
        onSelectDate={onSelectDate}
        dayStatusMap={dayStatusMap}
        dayDisplayStatusMap={dayDisplayStatusMap}
        daySummaryDataMap={daySummaryDataMap}
        dayNoteMap={dayNoteMap}
      />
      <div className="flex items-center justify-between gap-4">
        <StatusLegend />
        <button
          onClick={() => setShowResetConfirm(true)}
          className="rounded border px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Reset all data for this month"
        >
          Reset all
        </button>
      </div>

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
