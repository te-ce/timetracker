import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  workPeriodRepo,
  timeEntryRepo,
  configRepo,
  workLocationRepo,
  dayConfirmationRepo,
  dayTypeOverrideRepo,
  autoCategoryOverrideRepo,
  timeTrackingRepo,
  dayNoteRepo,
} from '../repositories/shared'
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
    mutationFn: async () => {
      const autoHours = Math.max(0, calculateWorkedHours(windows) - entries.reduce((s, e) => s + e.hours, 0))
      const resolvedAuto = resolveAutoCategory({
        date: selectedDate,
        globalDefault: config?.autoCategory ?? null,
        dayOverrides: autoCategoryOverride
          ? new Map<string, string>([[selectedDate, autoCategoryOverride]])
          : new Map<string, string>(),
      })
      if (resolvedAuto && autoHours > 0) {
        const existing = entries.find((e) => e.category === resolvedAuto)
        await timeEntryRepo.save({
          id: existing?.id ?? crypto.randomUUID(),
          date: selectedDate,
          category: resolvedAuto,
          hours: (existing?.hours ?? 0) + autoHours,
        })
      }
      await dayConfirmationRepo.confirm(selectedDate)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationByDate(selectedDate) })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationsAll })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })
    },
  })

  const unconfirmMutation = useMutation({
    mutationFn: () => dayConfirmationRepo.unconfirm(selectedDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationByDate(selectedDate) })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayConfirmationsAll })
    },
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
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
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
      const allEntries = await timeEntryRepo.findByDateRange(new Date('2000-01-01'), new Date('2099-12-31'))
      for (const entry of allEntries.filter((e) => e.category === oldName)) {
        await timeEntryRepo.save({ ...entry, category: newName })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })
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
      await workLocationRepo.save(selectedDate, next)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workLocationByDate(selectedDate) })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workLocationsAll })
    },
  })

  const noteMutation = useMutation({
    mutationFn: (note: string) =>
      note ? dayNoteRepo.save(selectedDate, note) : dayNoteRepo.delete(selectedDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayNoteByDate(selectedDate) })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dayNotesAll })
    },
  })

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [noteValue, setNoteValue] = useState<string | null>(null)

  const resetDayMutation = useMutation({
    mutationFn: async () => {
      const d = new Date(selectedDate)
      const entries = await timeEntryRepo.findByDateRange(d, d)
      const periods = await workPeriodRepo.findByDate(d)
      await Promise.all([
        ...entries.map((e) => timeEntryRepo.delete(e.id)),
        ...periods.map((p) => workPeriodRepo.delete(p.id)),
        workLocationRepo.delete(selectedDate),
        dayTypeOverrideRepo.delete(selectedDate),
        autoCategoryOverrideRepo.delete(selectedDate),
        dayConfirmationRepo.unconfirm(selectedDate),
        dayNoteRepo.delete(selectedDate),
      ])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
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
          <DayTypePicker date={selectedDate} repository={dayTypeOverrideRepo} />
          <button
            onClick={() => locationMutation.mutate()}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
            aria-label={`Work location: ${effectiveLocation}. Click to switch to ${effectiveLocation === 'Office' ? 'Remote' : 'Office'}`}
          >
            <span aria-hidden="true">{effectiveLocation === 'Office' ? '🏢' : '🏠'}</span> {effectiveLocation}
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

      <WorkPeriodPanel date={selectedDate} repository={workPeriodRepo} />

      <TimeEntryPanel
        date={selectedDate}
        repository={timeEntryRepo}
        timeTrackingRepository={timeTrackingRepo}
        workPeriodRepository={workPeriodRepo}
        customCategories={config?.customCategories ?? []}
        categoryOrder={config?.categoryOrder}
        categoryDescriptions={config?.categoryDescriptions}
        autoCategory={autoCategory}
        autoCategoryHours={Math.max(0, workedHours - manualTotal)}
        onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
        onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
        onCategoryDescriptionChange={(category, description) => categoryDescriptionMutation.mutate({ category, description })}
        onCategoryRename={(oldName, newName) => categoryRenameMutation.mutate({ oldName, newName })}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Note</span>
          {noteValue === null && dayNote && (
            <button
              onClick={() => noteMutation.mutate('')}
              className="text-xs text-red-500 dark:text-red-400 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {noteValue !== null ? (
          <div className="flex flex-col gap-1">
            <textarea
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 resize-none"
              rows={3}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              ref={(el) => el?.focus()}
              placeholder="Add a note for this day…"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setNoteValue(null)}
                className="rounded border px-3 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  noteMutation.mutate(noteValue.trim())
                  setNoteValue(null)
                }}
                className="rounded border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
              >
                Save
              </button>
            </div>
          </div>
        ) : dayNote ? (
          <button
            onClick={() => setNoteValue(dayNote)}
            className="w-full text-left rounded border px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 whitespace-pre-wrap"
          >
            {dayNote}
          </button>
        ) : (
          <button
            onClick={() => setNoteValue('')}
            className="w-full text-left rounded border border-dashed px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            Add a note…
          </button>
        )}
      </div>

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
