import { DayNoteEditor } from './DayNoteEditor'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useRepositories } from '../repositories/RepositoryContext'
import { OvertimeBar } from '../components/OvertimeBar'
import { WorkOverview } from '../components/WorkOverview'
import { DayTypePicker } from '../components/DayTypePicker'
import { toLocalIso } from '../domain/dateUtils'
import { STATUS_BADGE, STATUS_LABEL } from '../domain/statusColors'
import type { DayStatus } from '../domain/dayStatus'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useDayQuery } from '../hooks/useDayQuery'
import { useDayMutations } from '../hooks/useDayMutations'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface DayActionsProps {
  badgeStatus: Exclude<DayStatus, 'today'>
  statusReason: string
  isConfirmed: boolean
  onConfirm: () => void
  onUnconfirm: () => void
}

function DayActions({ badgeStatus, statusReason, isConfirmed, onConfirm, onUnconfirm }: DayActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {badgeStatus !== 'future' && (
        <div className="group relative">
          <span
            className={`inline-flex items-center cursor-help rounded-md border border-transparent px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[badgeStatus].bg} ${STATUS_BADGE[badgeStatus].text}`}
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
          onClick={onUnconfirm}
          className="rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
          aria-label="Unconfirm day"
        >
          ✓ Confirmed
        </button>
      ) : (
        <button
          onClick={onConfirm}
          className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Confirm day"
        >
          Confirm
        </button>
      )}
    </div>
  )
}

interface DayNavProps {
  selectedDate: string
  todayIso: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function DayNav({ selectedDate, todayIso, onPrev, onNext, onToday }: DayNavProps) {
  const isToday = selectedDate === todayIso
  return (
    <div className="flex items-center gap-4">
      <button
        aria-label="Previous day"
        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        onClick={onPrev}
      >
        ← Prev
      </button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <h2 className="text-xl font-semibold">{formatDate(selectedDate)}</h2>
        <button
          className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${isToday ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
          onClick={onToday}
          disabled={isToday}
          aria-label="Go to today"
        >
          Today
        </button>
      </div>
      <button
        aria-label="Next day"
        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        onClick={onNext}
      >
        Next →
      </button>
    </div>
  )
}

export function DayView() {
  const { monthRepo, timeTrackingRepo } = useRepositories()
  const navigate = useNavigate()
  const { date: selectedDate } = useSearch({ from: '/' })

  function setSelectedDate(date: string) {
    void navigate({ to: '/', search: { date } })
  }

  const {
    config,
    windows,
    autoCategoryOverride,
    dayTypeOverride,
    isConfirmed,
    dayNote,
    autoCategory,
    dayClassification,
    effectiveLocation,
    sollstunden,
    overtimeToDate,
    todayIso,
    officeDays,
    totalWorkDays,
    officePercent,
  } = useDayQuery(selectedDate)

  const { data: activeTracking = null } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => timeTrackingRepo.getActive(),
  })

  const dayMutations = useDayMutations({
    date: selectedDate,
    effectiveLocation,
    repository: monthRepo,
  })

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification
  const locationIcon = effectiveLocation === 'Office' ? '🏢' : '🏠'
  const locationToggle = effectiveLocation === 'Office' ? 'Remote' : 'Office'

  const { customCategories = [], categoryOrder, categoryDescriptions } = config ?? {}
  const liveWindowStart = windows.find((w) => w.end === null)?.start
  const officeStats = totalWorkDays > 0 ? { officeDays, totalWorkDays, officePercent } : {}

  function prevDay() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(toLocalIso(d))
  }
  function nextDay() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(toLocalIso(d))
  }

  return (
    <div className="flex flex-col gap-6">
      <DayNav
        selectedDate={selectedDate}
        todayIso={todayIso}
        onPrev={prevDay}
        onNext={nextDay}
        onToday={() => setSelectedDate(toLocalIso(new Date()))}
      />

      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
        liveWindowStart={liveWindowStart}
        activeTrackingStartedAt={activeTracking?.startedAt}
        {...officeStats}
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <DayTypePicker date={selectedDate} override={dayTypeOverride} repository={monthRepo} />
          <button
            onClick={() => dayMutations.toggleLocation.mutate()}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
            aria-label={`Work location: ${effectiveLocation}. Click to switch to ${locationToggle}`}
          >
            <span aria-hidden="true">{locationIcon}</span> {effectiveLocation}
          </button>
        </div>
        <div className="flex-1 min-w-0 self-stretch flex items-center">
          <DayNoteEditor dayNote={dayNote} onSave={(note) => dayMutations.saveNote.mutate(note)} />
        </div>
        <div className="shrink-0">
          <DayActions
            badgeStatus={badgeStatus}
            statusReason={statusReason}
            isConfirmed={isConfirmed}
            onConfirm={() => dayMutations.confirm.mutate()}
            onUnconfirm={() => dayMutations.unconfirm.mutate()}
          />
        </div>
      </div>

      <section aria-label="Work periods">
        <h3 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Work periods</h3>
        <WorkOverview
          date={selectedDate}
          windows={windows}
          repository={monthRepo}
          autoCategory={autoCategory ?? autoCategoryOverride}
          customCategories={customCategories}
          categoryOrder={categoryOrder}
          categoryDescriptions={categoryDescriptions}
        />
      </section>
    </div>
  )
}
