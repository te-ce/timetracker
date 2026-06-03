import { useState } from 'react'
import { DayNoteEditor } from './DayNoteEditor'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useRepositories } from '../repositories/RepositoryContext'
import { WorkPeriodEditor } from '../components/WorkPeriodEditor'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { OvertimeBar } from '../components/OvertimeBar'
import { DayTypePicker } from '../components/DayTypePicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { toLocalIso } from '../domain/dateUtils'
import { STATUS_BADGE, STATUS_LABEL } from '../domain/statusColors'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useDayQuery } from '../hooks/useDayQuery'
import { useDayMutations } from '../hooks/useDayMutations'
import { useCategoryMutations } from '../hooks/useCategoryMutations'

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
    globalAutoCategory: config?.autoCategory ?? null,
    customCategories: config?.customCategories ?? [],
    categoryOrder: config?.categoryOrder,
    categoryDescriptions: config?.categoryDescriptions,
  }
}

export function DayView() {
  const { monthRepo, configRepo, timeTrackingRepo } = useRepositories()
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

  const { globalAutoCategory, customCategories, categoryOrder, categoryDescriptions } = resolveConfigValues(config)
  const dayMutations = useDayMutations({
    date: selectedDate,
    windows,
    entries,
    autoCategoryOverride,
    globalAutoCategory,
    effectiveLocation,
    repository: monthRepo,
  })

  const categoryMutations = useCategoryMutations(config, configRepo, monthRepo)

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const locationIcon = effectiveLocation === 'Office' ? '🏢' : '🏠'
  const locationToggle = effectiveLocation === 'Office' ? 'Remote' : 'Office'

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
          <DayTypePicker date={selectedDate} override={dayTypeOverride} repository={monthRepo} />
          <button
            onClick={() => dayMutations.toggleLocation.mutate()}
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
              onClick={() => dayMutations.unconfirm.mutate()}
              className="rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              aria-label="Unconfirm day"
            >
              ✓ Confirmed
            </button>
          ) : (
            <button
              onClick={() => dayMutations.confirm.mutate()}
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

      <section aria-label="Work windows">
        <WorkPeriodEditor date={selectedDate} windows={windows} repository={monthRepo} />
      </section>

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
        callbacks={{
          onAutoCategoryChange: (cat) => categoryMutations.setAutoCategory.mutate(cat),
          onCategoryReorder: (order) => categoryMutations.reorderCategories.mutate(order),
          onCategoryDescriptionChange: (category, description) =>
            categoryMutations.setCategoryDescription.mutate({ category, description }),
          onCategoryRename: (oldName, newName) => categoryMutations.renameCategory.mutate({ oldName, newName }),
        }}
      />

      <DayNoteEditor dayNote={dayNote} onSave={(note) => dayMutations.saveNote.mutate(note)} />

      {showResetConfirm && (
        <ConfirmDialog
          title="Reset all data for this day?"
          message={`This will permanently delete all time entries, work periods, location, day type, and confirmation for ${formatDate(selectedDate)}. This cannot be undone.`}
          confirmLabel="Reset day"
          danger
          onConfirm={() => {
            setShowResetConfirm(false)
            dayMutations.resetDay.mutate()
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  )
}
