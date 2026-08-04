import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import type { ConfigRepository } from '../../infra/repositories/types'
import { renameCategoryAcrossAllMonths } from './categoryMutations'
import { MonthGrid } from './MonthTable'
import { MonthNav } from '../month/MonthNav'
import { MonthProgressMeter } from '../month/MonthProgressMeter'
import { buildMonthOverview } from '../month/monthOverview'
import { StatusLegend } from '../month/StatusLegend'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { invalidateConfig, invalidateMonthAll, invalidateMonthByYearMonth } from '../../shared/queryKeys'
import { useMonthView } from '../../shared/useMonthView'
import { officeStats } from '../../shared/officeStats'

async function saveCategoryOrder(configRepo: ConfigRepository, categoryOrder: string[]): Promise<void> {
  const cfg = await configRepo.get()
  await configRepo.save({ ...cfg, categoryOrder })
}

async function saveAutoCategory(configRepo: ConfigRepository, category: string): Promise<void> {
  const cfg = await configRepo.get()
  await configRepo.save({ ...cfg, autoCategory: category })
}

export function TableView() {
  const { monthRepo, configRepo } = useRepositories()
  const navigate = useNavigate()
  const search = useSearch({ from: '/table' })
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const queryClient = useQueryClient()

  const categoryReorderMutation = useMutation({
    mutationFn: (categoryOrder: string[]) => saveCategoryOrder(configRepo, categoryOrder),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const autoCategoryMutation = useMutation({
    mutationFn: (category: string) => saveAutoCategory(configRepo, category),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const categoryRenameMutation = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameCategoryAcrossAllMonths(oldName, newName, configRepo, monthRepo),
    onSuccess: () => {
      invalidateConfig(queryClient)
      invalidateMonthAll(queryClient)
    },
  })

  const noteMutation = useMutation({
    mutationFn: ({ date, note }: { date: string; note: string }) => monthRepo.saveNote(date, note),
    onSuccess: () => invalidateMonthByYearMonth(queryClient, year, month),
  })

  const view = useMonthView(year, month)
  const {
    config,
    summaries,
    workLocations,
    targetHoursPerDay,
    todayIso,
    todayBalance,
    isOvertimeReady,
    priorMonthsOvertime,
  } = view

  const { officeDays, totalWorkDays, officePercent } = officeStats(summaries.days, (date) => workLocations.get(date))

  const overview = buildMonthOverview({
    days: summaries.days,
    targetHoursPerDay,
    today: todayIso,
    cumulativeBalance: priorMonthsOvertime,
  })

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [clearDayDate, setClearDayDate] = useState<string | null>(null)
  // Consume the deep-link logDate once so the dialog only opens on arrival.
  const [pendingLogDate, setPendingLogDate] = useState(search.logDate)
  useEffect(() => {
    if (pendingLogDate) setPendingLogDate(undefined)
  }, [pendingLogDate])

  const resetMonthMutation = useMutation({
    mutationFn: () => monthRepo.deleteMonth(year, month),
    onSuccess: () => invalidateMonthByYearMonth(queryClient, year, month),
  })

  const clearDayMutation = useMutation({
    mutationFn: (date: string) => monthRepo.resetDay(date),
    onSuccess: () => invalidateMonthByYearMonth(queryClient, year, month),
  })

  function onMonthChange(y: number, m: number) {
    setYear(y)
    setMonth(m + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const showOfficeStats = config.officeStats

  const table = (
    <MonthGrid
      view={view}
      repository={monthRepo}
      showOfficeStats={showOfficeStats}
      onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
      onCategoryRename={(oldName, newName) => categoryRenameMutation.mutate({ oldName, newName })}
      onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
      onNoteChange={(date, note) => noteMutation.mutate({ date, note })}
      onSelectDate={(date) => void navigate({ to: '/', search: { date } })}
      onClearDay={(date) => setClearDayDate(date)}
      initialLogDate={pendingLogDate}
    />
  )

  const footer = (
    <div className="flex items-center justify-between gap-4">
      <StatusLegend className="px-1" />
      <button
        type="button"
        onClick={() => setShowResetConfirm(true)}
        className="rounded border px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Reset all data for this month"
      >
        Reset all
      </button>
    </div>
  )

  const dialogs = (
    <>
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
    </>
  )

  return (
    <div className="flex flex-col gap-6">
      <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} />
      <MonthProgressMeter
        overview={overview}
        officeStats={showOfficeStats ? { officeDays, totalWorkDays, officePercent } : null}
        todayBalance={todayBalance}
        isTodayLoading={!isOvertimeReady}
      />
      {table}
      {footer}
      {dialogs}
    </div>
  )
}
