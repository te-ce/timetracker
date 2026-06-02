import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../repositories/RepositoryContext'
import type { ConfigRepository, AppConfig, WorkLocation } from '../repositories/types'
import { renameCategoryAcrossAllMonths } from '../domain/categoryOps'
import { MonthGrid } from '../components/MonthGrid'
import { OvertimeBar } from '../components/OvertimeBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useMonthQuery } from '../hooks/useMonthQuery'

interface GridConfig {
  autoCategory: string
  customCategories: string[]
  sprintStartDate: string
  sprintLengthDays: number
  defaultWorkLocation: WorkLocation | null
}

function resolveGridConfig(config: AppConfig | undefined): GridConfig {
  if (!config) {
    return {
      autoCategory: '_COREMEDIA',
      customCategories: [],
      sprintStartDate: '2024-01-01',
      sprintLengthDays: 14,
      defaultWorkLocation: null,
    }
  }
  return {
    autoCategory: config.autoCategory ?? '_COREMEDIA',
    customCategories: config.customCategories,
    sprintStartDate: config.sprintStartDate ?? '2024-01-01',
    sprintLengthDays: config.sprintLengthDays,
    defaultWorkLocation: config.defaultWorkLocation ?? null,
  }
}

function shiftMonth(year: number, month: number, delta: -1 | 1): { year: number; month: number } {
  if (delta === -1) return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

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
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
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

  const { config, dayTypeOverrides, workLocations, confirmedDays, dayNotes, overtimeToDate, trackedWorkDays, officeDays, officePercent, sollstunden } =
    useMonthQuery(year, month)

  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const resetMonthMutation = useMutation({
    mutationFn: () => monthRepo.deleteMonth(year, month),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) }),
  })

  function prevMonth() {
    const next = shiftMonth(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
  }

  function nextMonth() {
    const next = shiftMonth(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const gridConfig = resolveGridConfig(config)

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
