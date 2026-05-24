import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MonthCalendar } from '../components/MonthCalendar'
import { OvertimeBar } from '../components/OvertimeBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useMonthQuery } from '../hooks/useMonthQuery'
import {
  timeEntryRepo,
  workPeriodRepo,
  workLocationRepo,
  dayTypeOverrideRepo,
  autoCategoryOverrideRepo,
  dayConfirmationRepo,
} from '../repositories/shared'
import { toLocalIso } from '../domain/dateUtils'
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

  const queryClient = useQueryClient()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  const monthLabel = from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const resetMonthMutation = useMutation({
    mutationFn: async () => {
      const fromIso = toLocalIso(from)
      const toIso = toLocalIso(to)
      const [entries, periods, locations, overrides, autoCatOverrides, confirmedSet] = await Promise.all([
        timeEntryRepo.findByDateRange(from, to),
        workPeriodRepo.findByDateRange(from, to),
        workLocationRepo.findByDateRange(fromIso, toIso),
        dayTypeOverrideRepo.findByDateRange(fromIso, toIso),
        autoCategoryOverrideRepo.findByDateRange(fromIso, toIso),
        dayConfirmationRepo.findConfirmedInRange(fromIso, toIso),
      ])
      await Promise.all([
        ...entries.map((e) => timeEntryRepo.delete(e.id)),
        ...periods.map((p) => workPeriodRepo.delete(p.id)),
        ...[...locations.keys()].map((d) => workLocationRepo.delete(d)),
        ...[...overrides.keys()].map((d) => dayTypeOverrideRepo.delete(d)),
        ...[...autoCatOverrides.keys()].map((d) => autoCategoryOverrideRepo.delete(d)),
        ...[...confirmedSet].map((d) => dayConfirmationRepo.unconfirm(d)),
      ])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  })

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
      <div className="flex justify-end">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="rounded border px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
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
