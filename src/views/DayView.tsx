import { useState } from 'react'
import { DayNoteEditor } from './DayNoteEditor'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { monthRepo, configRepo, timeTrackingRepo } from '../repositories/shared'
import { WorkPeriodPanel } from '../components/WorkPeriodPanel'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { OvertimeBar } from '../components/OvertimeBar'
import { DayTypePicker } from '../components/DayTypePicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { calculateWorkedHours } from '../domain/worktime'
import { resolveAutoCategory } from '../domain/autoCategoryOverride'
import { toLocalIso } from '../domain/dateUtils'
import { STATUS_BADGE, STATUS_LABEL } from '../domain/statusColors'
import type { WorkLocation } from '../repositories/types'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useDayQuery } from '../hooks/useDayQuery'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function resolveConfigValues(config: import('../repositories/types').AppConfig | undefined) {
  return {
    autoCategory: config?.autoCategory ?? null,
    customCategories: config?.customCategories ?? [],
    categoryOrder: config?.categoryOrder,
    categoryDescriptions: config?.categoryDescriptions,
  }
}

function invalidateMonth(queryClient: ReturnType<typeof useQueryClient>, date: string) {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) })
}

async function confirmDayWithAutoCategory(date: string, windows: import('../repositories/types').WorkPeriod[], entries: import('../repositories/types').TimeEntry[], autoCategoryOverride: string | null, globalAutoCategory: string | null): Promise<void> {
  const autoHours = Math.max(0, calculateWorkedHours(windows) - entries.reduce((s, e) => s + e.hours, 0))
  const resolvedAuto = resolveAutoCategory({
    date,
    globalDefault: globalAutoCategory,
    dayOverrides: autoCategoryOverride
      ? new Map<string, string>([[date, autoCategoryOverride]])
      : new Map<string, string>(),
  })
  await monthRepo.updateDay(date, (day) => {
    let updatedEntries = [...day.entries]
    if (resolvedAuto && autoHours > 0) {
      const existing = updatedEntries.find((e) => e.category === resolvedAuto)
      updatedEntries = updatedEntries.filter((e) => e.category !== resolvedAuto || e.id === existing?.id)
      const autoEntry = { id: existing?.id ?? crypto.randomUUID(), category: resolvedAuto, hours: (existing?.hours ?? 0) + autoHours }
      updatedEntries = [...updatedEntries.filter((e) => e.id !== autoEntry.id), autoEntry]
    }
    return { ...day, entries: updatedEntries, confirmed: true }
  })
}

async function renameCategoryAcrossAllMonths(oldName: string, newName: string): Promise<void> {
  const cfg = await configRepo.get()
  const newCustomCategories = cfg.customCategories.map((c) => (c === oldName ? newName : c))
  const newOrder = (cfg.categoryOrder ?? []).map((c) => (c === oldName ? newName : c))
  const newDescriptions = cfg.categoryDescriptions
    ? Object.fromEntries(Object.entries(cfg.categoryDescriptions).map(([k, v]) => [k === oldName ? newName : k, v]))
    : undefined
  const newMapping = cfg.categoryMapping
    ? Object.fromEntries(Object.entries(cfg.categoryMapping).map(([k, v]) => [k === oldName ? newName : k, v]))
    : undefined
  await configRepo.save({ ...cfg, customCategories: newCustomCategories, categoryOrder: newOrder, categoryDescriptions: newDescriptions, categoryMapping: newMapping })
  const allMonths = await monthRepo.getAllMonths()
  for (const ym of allMonths) {
    const year = parseInt(ym.slice(0, 4))
    const month = parseInt(ym.slice(5, 7))
    const data = await monthRepo.getMonth(year, month)
    for (const [date, day] of Object.entries(data)) {
      if (day.entries.some((e) => e.category === oldName)) {
        await monthRepo.updateDay(date, (d) => ({
          ...d,
          entries: d.entries.map((e) => (e.category === oldName ? { ...e, category: newName } : e)),
        }))
      }
    }
  }
}


export function DayView() {
  const navigate = useNavigate()
  const { date: selectedDate } = useSearch({ from: '/day' })

  function setSelectedDate(date: string) {
    void navigate({ to: '/day', search: { date } })
  }

  const {
    config,
    windows,
    entries,
    autoCategoryOverride,
    dayTypeOverride,
    isConfirmed,
    dayNote,
    workedHours,
    manualTotal,
    autoCategory,
    dayClassification,
    effectiveLocation,
    sollstunden,
    overtimeToDate,
    todayIso,
  } = useDayQuery(selectedDate)

  const { data: activeTracking = null } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
  })

  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: () => confirmDayWithAutoCategory(selectedDate, windows, entries, autoCategoryOverride, configAutoCategory),
    onSuccess: () => invalidateMonth(queryClient, selectedDate),
  })

  const unconfirmMutation = useMutation({
    mutationFn: () => monthRepo.updateDay(selectedDate, (day) => ({ ...day, confirmed: false })),
    onSuccess: () => invalidateMonth(queryClient, selectedDate),
  })

  const autoCategoryMutation = useMutation({
    mutationFn: (cat: string | null) => configRepo.save({ ...config!, autoCategory: cat }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const categoryReorderMutation = useMutation({
    mutationFn: (categoryOrder: string[]) => configRepo.save({ ...config!, categoryOrder }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const categoryRenameMutation = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      renameCategoryAcrossAllMonths(oldName, newName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthAll })
    },
  })

  const categoryDescriptionMutation = useMutation({
    mutationFn: ({ category, description }: { category: string; description: string }) => {
      const current = config?.categoryDescriptions ?? {}
      const updated = description ? { ...current, [category]: description } : Object.fromEntries(Object.entries(current).filter(([k]) => k !== category))
      return configRepo.save({ ...config!, categoryDescriptions: updated })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const locationMutation = useMutation({
    mutationFn: async () => {
      const next: WorkLocation = effectiveLocation === 'Remote' ? 'Office' : 'Remote'
      await monthRepo.updateDay(selectedDate, (day) => ({ ...day, location: next }))
    },
    onSuccess: () => invalidateMonth(queryClient, selectedDate),
  })

  const noteMutation = useMutation({
    mutationFn: (note: string) =>
      monthRepo.updateDay(selectedDate, (day) => {
        const updated = { ...day }
        delete updated.note
        return note ? { ...updated, note } : updated
      }),
    onSuccess: () => invalidateMonth(queryClient, selectedDate),
  })

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const locationIcon = effectiveLocation === 'Office' ? '🏢' : '🏠'
  const locationToggle = effectiveLocation === 'Office' ? 'Remote' : 'Office'
  const { autoCategory: configAutoCategory, customCategories, categoryOrder, categoryDescriptions } = resolveConfigValues(config)

  const resetDayMutation = useMutation({
    mutationFn: () =>
      monthRepo.updateDay(selectedDate, () => ({ entries: [], windows: [] })),
    onSuccess: () => invalidateMonth(queryClient, selectedDate),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          aria-label="Previous day"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() - 1)
            setSelectedDate(toLocalIso(d))
          }}
        >
          ← Prev
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <h2 className="text-xl font-semibold">{formatDate(selectedDate)}</h2>
          <button
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${selectedDate === todayIso ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
            onClick={() => setSelectedDate(toLocalIso(new Date()))}
            disabled={selectedDate === todayIso}
            aria-label="Go to today"
          >
            Today
          </button>
        </div>
        <button
          aria-label="Next day"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() + 1)
            setSelectedDate(toLocalIso(d))
          }}
        >
          Next →
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DayTypePicker
            date={selectedDate}
            override={dayTypeOverride}
            repository={monthRepo}
          />
          <button
            onClick={() => locationMutation.mutate()}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
            aria-label={`Work location: ${effectiveLocation}. Click to switch to ${locationToggle}`}
          >
            <span aria-hidden="true">{locationIcon}</span> {effectiveLocation}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {badgeStatus !== 'future' && (
            <div className="group relative">
              <span
                className={`cursor-help rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[badgeStatus].bg} ${STATUS_BADGE[badgeStatus].text}`}
              >
                {STATUS_LABEL[badgeStatus]}
              </span>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 group-hover:block z-10">
                <div className="rounded bg-gray-800 dark:bg-gray-700 px-2 py-1 text-xs text-white shadow-lg whitespace-nowrap">
                  {statusReason}
                </div>
              </div>
            </div>
          )}
          {isConfirmed ? (
            <button
              onClick={() => unconfirmMutation.mutate()}
              className="rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              aria-label="Unconfirm day"
            >
              ✓ Confirmed
            </button>
          ) : (
            <button
              onClick={() => confirmMutation.mutate()}
              className="rounded border px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Confirm day"
            >
              Confirm
            </button>
          )}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="rounded border px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
            aria-label="Reset all data for this day"
          >
            Reset all
          </button>
        </div>
      </div>

      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
        activeTrackingStartedAt={activeTracking?.startedAt}
      />

      <WorkPeriodPanel date={selectedDate} windows={windows} repository={monthRepo} />

      <TimeEntryPanel
        date={selectedDate}
        entries={entries}
        repository={monthRepo}
        timeTrackingRepository={timeTrackingRepo}
        activeTracking={activeTracking}
        customCategories={customCategories}
        categoryOrder={categoryOrder}
        categoryDescriptions={categoryDescriptions}
        autoCategory={autoCategory}
        autoCategoryHours={Math.max(0, workedHours - manualTotal)}
        onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
        onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
        onCategoryDescriptionChange={(category, description) => categoryDescriptionMutation.mutate({ category, description })}
        onCategoryRename={(oldName, newName) => categoryRenameMutation.mutate({ oldName, newName })}
      />

      <DayNoteEditor dayNote={dayNote} onSave={(note) => noteMutation.mutate(note)} />

      {showResetConfirm && (
        <ConfirmDialog
          title="Reset all data for this day?"
          message={`This will permanently delete all time entries, work periods, location, day type, and confirmation for ${formatDate(selectedDate)}. This cannot be undone.`}
          confirmLabel="Reset day"
          danger
          onConfirm={() => {
            setShowResetConfirm(false)
            resetDayMutation.mutate()
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  )
}
