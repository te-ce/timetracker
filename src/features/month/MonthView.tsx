import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MonthNav } from './MonthNav'
import { MonthCalendar } from './MonthCalendar'
import { MonthProgressMeter } from './MonthProgressMeter'
import { MonthAttentionStrip } from './MonthAttentionStrip'
import { StatusLegend } from './StatusLegend'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { useMonthView } from '../../shared/useMonthView'
import { officeStats } from '../../shared/officeStats'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { invalidateMonthByYearMonth } from '../../shared/queryKeys'
import { useUndoStore } from '../../shared/undoStore'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'
import type { DaySummaryData } from '../../shared/DaySummaryBody'
import type { WorkLocation } from '../../infra/repositories/types'

export function MonthView() {
  const { monthRepo, trashRepo } = useRepositories()
  const navigate = useNavigate()
  const { year, month } = useSearch({ from: '/month' })

  function onSelectDate(date: string) {
    void navigate({ to: '/', search: { date } })
  }

  function onMonthChange(y: number, m: number) {
    void navigate({ to: '/month', search: { year: y, month: m + 1 } })
  }

  const queryClient = useQueryClient()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const resetMonthMutation = useMutation({
    mutationFn: async () => {
      const snapshot = await monthRepo.getMonth(year, month)
      const trashId = await trashRepo.moveMonthToTrash(year, month, snapshot)
      await monthRepo.deleteMonth(year, month)
      return { snapshot, trashId }
    },
    onSuccess: ({ snapshot, trashId }) => {
      invalidateMonthByYearMonth(queryClient, year, month)
      let currentTrashId = trashId
      useUndoStore.getState().push({
        description: `Delete ${monthLabel}`,
        undo: async () => {
          await monthRepo.restoreMonth(year, month, snapshot)
          await trashRepo.purge(currentTrashId)
          invalidateMonthByYearMonth(queryClient, year, month)
        },
        redo: async () => {
          currentTrashId = await trashRepo.moveMonthToTrash(year, month, snapshot)
          await monthRepo.deleteMonth(year, month)
          invalidateMonthByYearMonth(queryClient, year, month)
        },
      })
    },
  })

  const { config, summaries, overview, workLocations, dayNotes, todayBalance, isOvertimeReady } = useMonthView(
    year,
    month,
  )

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
      preferCategoryDescriptionAsPrimary: config.preferCategoryDescriptionAsPrimary,
    }
  }
  const dayNoteMap: Record<string, string> = Object.fromEntries(dayNotes)
  const dayLocationMap: Record<string, WorkLocation> = Object.fromEntries(workLocations)

  return (
    <div className="flex flex-col gap-4">
      <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} />
      <MonthProgressMeter
        overview={overview}
        officeStats={config.officeStats ? officeStats(summaries.days, (date) => workLocations.get(date)) : null}
        todayBalance={todayBalance}
        isTodayLoading={!isOvertimeReady}
      />
      <MonthCalendar
        year={year}
        month={month - 1}
        onSelectDate={onSelectDate}
        dayStatusMap={dayStatusMap}
        dayDisplayStatusMap={dayDisplayStatusMap}
        daySummaryDataMap={daySummaryDataMap}
        dayNoteMap={dayNoteMap}
        dayLocationMap={dayLocationMap}
        overview={overview}
      />
      <MonthAttentionStrip days={overview.attention} onSelectDate={onSelectDate} />
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
          message={`This will delete all time entries, work periods, locations, day types, and confirmations for ${monthLabel}. Press Ctrl+Z to undo, or restore it later from Settings → Trash.`}
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
