import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MonthNav } from './MonthNav'
import { MonthCalendar } from './MonthCalendar'
import { OvertimeBar } from './OvertimeBar'
import { StatusLegend } from './StatusLegend'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
// PROTOTYPE — month-overview variants, delete with src/prototypes/month-overview/
import { MonthOverviewPrototype } from '../../prototypes/month-overview/MonthOverviewPrototype'
import { MonthVariantSwitcher, isMonthVariantKey } from '../../prototypes/month-overview/MonthVariantSwitcher'
import { useMonthView } from '../../shared/useMonthView'
import { officeStats } from '../../shared/officeStats'
import { useHideOvertimeBar } from '../../shared/useHideOvertimeBar'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { invalidateMonthByYearMonth } from '../../shared/queryKeys'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'
import type { DaySummaryData } from '../../shared/DaySummaryBody'

export function MonthView() {
  const { monthRepo, configRepo } = useRepositories()
  const navigate = useNavigate()
  // PROTOTYPE — `variant` selects a month-overview prototype; 'now' is this shipped view.
  const { year, month, variant } = useSearch({ from: '/month' })
  const prototypeVariant = isMonthVariantKey(variant) ? variant : 'now'

  function onSelectDate(date: string) {
    void navigate({ to: '/', search: { date } })
  }

  function onMonthChange(y: number, m: number) {
    void navigate({ to: '/month', search: { year: y, month: m + 1, variant: prototypeVariant } })
  }

  const queryClient = useQueryClient()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const resetMonthMutation = useMutation({
    mutationFn: () => monthRepo.deleteMonth(year, month),
    onSuccess: () => invalidateMonthByYearMonth(queryClient, year, month),
  })

  const view = useMonthView(year, month)
  const { config, summaries, workLocations, dayNotes, todayBalance, isOvertimeReady } = view

  const { officeDays, totalWorkDays, officePercent } = officeStats(summaries.days, (date) => workLocations.get(date))

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
      categoryDescriptions: config.categoryDescriptions,
    }
  }
  const dayNoteMap: Record<string, string> = Object.fromEntries(dayNotes)

  const showOvertimeBar = config.showOvertimeBar
  const showOfficeStats = config.officeStats
  const hideOvertimeMutation = useHideOvertimeBar(configRepo)

  // PROTOTYPE — throwaway variant gate, remove with src/prototypes/month-overview/
  if (prototypeVariant !== 'now') {
    return (
      <MonthOverviewPrototype
        variant={prototypeVariant}
        view={view}
        onSelectDate={onSelectDate}
        onMonthChange={onMonthChange}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthVariantSwitcher current="now" year={year} month={month} />
      <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} />
      {showOvertimeBar && (
        <OvertimeBar
          balance={todayBalance}
          showTotalWorked={config.showTotalWorked}
          officeStats={showOfficeStats ? { officeDays, totalWorkDays, officePercent } : null}
          onHide={() => hideOvertimeMutation.mutate()}
          isLoading={!isOvertimeReady}
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
          type="button"
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
