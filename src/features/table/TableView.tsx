import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import type { ConfigRepository } from '../../infra/repositories/types'
import { renameCategoryAcrossAllMonths } from './categoryMutations'
import { MonthGrid } from './MonthTable'
import { MonthNav, OvertimeBar, StatusLegend } from '../month'
import { DEFAULT_WEEKDAY_HOURS } from '../../shared/weekdayHours'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { invalidateConfig, invalidateMonthAll, invalidateMonthByYearMonth } from '../../shared/queryKeys'
import { useMonthSummaries } from '../../shared/useMonthSummaries'
import { resolveTableConfig } from './tableConfig'

function calcOfficePercent(officeDays: number, totalWorkDays: number): number {
  if (totalWorkDays === 0) return 0
  return Math.round((officeDays / totalWorkDays) * 100)
}

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

  const {
    config,
    summaries,
    dayTypeOverrides,
    workLocations,
    confirmedDays,
    dayNotes,
    overtimeToDate,
    sollstunden,
    todayLiveWindowStart,
    todayPlannedStopTime,
  } = useMonthSummaries(year, month)

  const hideOvertimeMutation = useMutation({
    mutationFn: async () => {
      const cfg = await configRepo.get()
      await configRepo.save({ ...cfg, showOvertimeBar: false })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  const trackedWorkDays = summaries.days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = calcOfficePercent(officeDays, trackedWorkDays.length)

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [clearDayDate, setClearDayDate] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(search.expanded)
  const [logSignal, setLogSignal] = useState(0)
  // Consume the deep-link logDate once; clearing it stops the dialog from
  // reopening when MonthGrid remounts on every fullscreen toggle.
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

  const showOvertimeBar = config?.showOvertimeBar !== false
  const showOfficeStats = config?.officeStats !== false
  const gridConfig = resolveTableConfig(config)

  const table = (
    <MonthGrid
      year={year}
      month={month}
      expanded={expanded}
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
      showOfficeStats={showOfficeStats}
      weekdayHours={config?.weekdayHours ?? DEFAULT_WEEKDAY_HOURS}
      onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
      onCategoryRename={(oldName, newName) => categoryRenameMutation.mutate({ oldName, newName })}
      onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
      onNoteChange={(date, note) => noteMutation.mutate({ date, note })}
      onSelectDate={(date) => void navigate({ to: '/', search: { date } })}
      onClearDay={(date) => setClearDayDate(date)}
      initialLogDate={pendingLogDate}
      openLogSignal={logSignal}
    />
  )

  const logWorkBtn = (
    <button
      type="button"
      onClick={() => setLogSignal((n) => n + 1)}
      className="rounded border px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      Log work
    </button>
  )

  const expandBtn = (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      aria-label={expanded ? 'Collapse table' : 'Expand table'}
      aria-pressed={expanded}
      className="rounded border px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      {expanded ? '↙' : '↗'}
    </button>
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

  if (expanded) {
    return (
      <div data-testid="table-overlay" className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} compact />
          <div className="flex items-center gap-2">
            {logWorkBtn}
            {expandBtn}
          </div>
        </div>
        <div className="flex-1 min-h-0 px-4 py-2">{table}</div>
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">{footer}</div>
        {dialogs}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthNav year={year} month={month - 1} onMonthChange={onMonthChange} />
      {showOvertimeBar && (
        <OvertimeBar
          sollstunden={sollstunden}
          priorOvertime={overtimeToDate.priorOvertime}
          workedToday={overtimeToDate.workedToday}
          liveWindowStart={todayLiveWindowStart ?? null}
          plannedStopTime={todayPlannedStopTime ?? null}
          remainingTimeMode={config?.remainingTimeMode ?? 'until-zero-overtime'}
          showTotalWorked={config?.showTotalWorked === true}
          {...(showOfficeStats ? { officeDays, totalWorkDays: trackedWorkDays.length, officePercent } : {})}
          onHide={() => hideOvertimeMutation.mutate()}
        />
      )}
      <div className="flex justify-end gap-2">
        {logWorkBtn}
        {expandBtn}
      </div>
      {table}
      {footer}
      {dialogs}
    </div>
  )
}
