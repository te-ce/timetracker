import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { timeEntryRepo, configRepo, dayTypeOverrideRepo, dayConfirmationRepo, workLocationRepo, workPeriodRepo, autoCategoryOverrideRepo } from '../repositories/shared'
import { MonthGrid } from '../components/MonthGrid'
import { OvertimeBar } from '../components/OvertimeBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useMonthQuery } from '../hooks/useMonthQuery'

export function MonthGridView() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const queryClient = useQueryClient()
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)

  const categoryReorderMutation = useMutation({
    mutationFn: async (categoryOrder: string[]) => {
      const cfg = await configRepo.get()
      return configRepo.save({ ...cfg, categoryOrder })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const autoCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      const cfg = await configRepo.get()
      return configRepo.save({ ...cfg, autoCategory: category })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const categoryRenameMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const cfg = await configRepo.get()
      const newCustomCategories = cfg.customCategories.map((c) => (c === oldName ? newName : c))
      const newOrder = (cfg.categoryOrder ?? []).map((c) => (c === oldName ? newName : c))
      await configRepo.save({ ...cfg, customCategories: newCustomCategories, categoryOrder: newOrder })
      const currentEntries = await timeEntryRepo.findByDateRange(from, to)
      for (const entry of currentEntries.filter((e) => e.category === oldName)) {
        await timeEntryRepo.save({ ...entry, category: newName })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })
    },
  })

  const { config, dayTypeOverrides, workLocations, confirmedDays, overtimeToDate, trackedWorkDays, officeDays, officePercent, sollstunden } =
    useMonthQuery(year, month)

  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else setMonth(month + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <button onClick={prevMonth} className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700">
          ← Prev
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <button
            onClick={() => {
              const now = new Date()
              setYear(now.getFullYear())
              setMonth(now.getMonth() + 1)
            }}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${isCurrentMonth ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'}`}
            aria-disabled={isCurrentMonth}
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="rounded border px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
            aria-label="Reset all data for this month"
          >
            Reset all
          </button>
          <button onClick={nextMonth} className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700">
            Next →
          </button>
        </div>
      </div>
      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
        officeDays={officeDays}
        totalWorkDays={trackedWorkDays.length}
        officePercent={officePercent}
      />
      <MonthGrid
        year={year}
        month={month}
        timeEntryRepository={timeEntryRepo}
        workPeriodRepository={workPeriodRepo}
        dayConfirmationRepository={dayConfirmationRepo}
        dayTypeOverrideRepository={dayTypeOverrideRepo}
        workLocationRepository={workLocationRepo}
        autoCategory={config?.autoCategory ?? '_COREMEDIA'}
        customCategories={config?.customCategories ?? []}
        categoryOrder={config?.categoryOrder}
        dayTypes={dayTypeOverrides}
        confirmedDays={confirmedDays}
        sprintStartDate={config?.sprintStartDate ?? '2024-01-01'}
        sprintLengthDays={config?.sprintLengthDays ?? 14}
        workLocations={workLocations}
        defaultWorkLocation={config?.defaultWorkLocation ?? null}
        onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
        onCategoryRename={(oldName, newName) => categoryRenameMutation.mutate({ oldName, newName })}
        onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
        onSelectDate={(date) => void navigate({ to: '/day', search: { date } })}
      />

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
