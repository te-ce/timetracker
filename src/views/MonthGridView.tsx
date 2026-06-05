import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../repositories/RepositoryContext'
import type { ConfigRepository } from '../repositories/types'
import { renameCategoryAcrossAllMonths } from '../domain/categoryMutations'
import { MonthGrid } from '../components/MonthGrid'
import { MonthNav } from '../components/MonthNav'
import { OvertimeBar } from '../components/OvertimeBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusLegend } from '../components/StatusLegend'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useMonthSummaries } from '../hooks/useMonthSummaries'
import { resolveGridConfig } from './gridConfig'

async function saveCategoryOrder(configRepo: ConfigRepository, categoryOrder: string[]): Promise<void> {
  const cfg = await configRepo.get()
  await configRepo.save({ ...cfg, categoryOrder })
}

async function saveAutoCategory(configRepo: ConfigRepository, category: string): Promise<void> {
  const cfg = await configRepo.get()
  await configRepo.save({ ...cfg, autoCategory: category })
}

export function MonthGridView() {
  const { monthRepo, configRepo, timeTrackingRepo } = useRepositories()
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const queryClient = useQueryClient()
  const { data: activeTracking = null } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
  })

  const categoryReorderMutation = useMutation({
    mutationFn: (categoryOrder: string[]) => saveCategoryOrder(configRepo, categoryOrder),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const autoCategoryMutation = useMutation({
    mutationFn: (category: string) => saveAutoCategory(configRepo, category),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const categoryRenameMutation = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameCategoryAcrossAllMonths(oldName, newName, configRepo, monthRepo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthAll })
    },
  })

  const noteMutation = useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) =>
      monthRepo.updateDay(date, (day) => {
        const updated = { ...day }
        delete updated.note
        return note ? { ...updated, note } : updated
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) }),
  })

  const { config, summaries, dayTypeOverrides, workLocations, confirmedDays, dayNotes, overtimeToDate, sollstunden } =
    useMonthSummaries(year, month)

  const trackedWorkDays = summaries.days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = trackedWorkDays.length > 0 ? Math.round((officeDays / trackedWorkDays.length) * 100) : 0

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [clearDayDate, setClearDayDate] = useState<string | null>(null)

  const resetMonthMutation = useMutation({
    mutationFn: () => monthRepo.deleteMonth(year, month),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) }),
  })

  const clearDayMutation = useMutation({
    mutationFn: (date: string) => monthRepo.updateDay(date, () => ({ windows: [] })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) }),
  })

  function onMonthChange(y: number, m: number) {
    setYear(y)
    setMonth(m + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const gridConfig = resolveGridConfig(config)

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
      <MonthGrid
        year={year}
        month={month}
        repository={monthRepo}
        autoCategory={gridConfig.autoCategory}
        customCategories={gridConfig.customCategories}
        categoryOrder={config ? config.categoryOrder : undefined}
        categoryDescriptions={config?.categoryDescriptions}
        dayTypes={dayTypeOverrides}
        confirmedDays={confirmedDays}
        sprintStartDate={gridConfig.sprintStartDate}
        sprintLengthDays={gridConfig.sprintLengthDays}
        workLocations={workLocations}
        defaultWorkLocation={gridConfig.defaultWorkLocation}
        dayNotes={dayNotes}
        onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
        onCategoryRename={(oldName, newName) => categoryRenameMutation.mutate({ oldName, newName })}
        onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
        onNoteChange={(date, note) => noteMutation.mutate({ date, note })}
        onSelectDate={(date) => void navigate({ to: '/', search: { date } })}
        onClearDay={(date) => setClearDayDate(date)}
      />
      <div className="flex items-center justify-between gap-4">
        <StatusLegend className="px-1" />
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

      {clearDayDate && (
        <ConfirmDialog
          title={`Clear data for ${clearDayDate}?`}
          message={`This will permanently delete all work periods, location, day type, and confirmation for ${clearDayDate}. This cannot be undone.`}
          confirmLabel="Clear day"
          danger
          onConfirm={() => {
            const date = clearDayDate
            setClearDayDate(null)
            clearDayMutation.mutate(date)
          }}
          onCancel={() => setClearDayDate(null)}
        />
      )}
    </div>
  )
}
