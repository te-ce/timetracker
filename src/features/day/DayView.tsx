import { DayNoteEditor } from './DayNoteEditor'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { OvertimeBar } from '../month'
import { WorkOverview } from './WorkOverview'
import { DayTypePicker } from './DayTypePicker'
import { toLocalIso } from '../../shared/dateUtils'
import { STATUS_BADGE, STATUS_LABEL } from '../../shared/statusColors'
import type { DayStatus } from '../../shared/dayStatus'
import { invalidateConfig } from '../../shared/queryKeys'
import { findOpenPeriod, derivePlannedStopState, calculateProjectedWorkedHours } from '../../shared/worktime'
import { Tooltip } from '../../shared'
import { useDayQuery } from './useDayQuery'
import { useDayMutations } from './useDayMutations'

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
        <Tooltip content={statusReason}>
          <span
            className={`inline-flex items-center cursor-help rounded-md border border-transparent px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[badgeStatus].bg} ${STATUS_BADGE[badgeStatus].text}`}
          >
            {STATUS_LABEL[badgeStatus]}
          </span>
        </Tooltip>
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
  const { monthRepo, configRepo } = useRepositories()
  const navigate = useNavigate()
  const { date: selectedDate } = useSearch({ from: '/' })

  function setSelectedDate(date: string) {
    void navigate({ to: '/', search: { date } })
  }

  const {
    config,
    windows,
    autoCategoryOverride,
    isConfirmed,
    dayNote,
    autoCategory,
    dayClassification,
    effectiveLocation,
    selectedDayType,
    sollstunden,
    overtimeToDate,
    todayIso,
    officeDays,
    totalWorkDays,
    officePercent,
  } = useDayQuery(selectedDate)

  const dayMutations = useDayMutations({
    date: selectedDate,
    effectiveLocation,
    repository: monthRepo,
  })

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification
  const locationIcon = effectiveLocation === 'Office' ? '🏢' : '🏠'
  const locationToggle = effectiveLocation === 'Office' ? 'Remote' : 'Office'

  const queryClient = useQueryClient()
  const hideOvertimeMutation = useMutation({
    mutationFn: async () => {
      const cfg = await configRepo.get()
      await configRepo.save({ ...cfg, showOvertimeBar: false })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  const { customCategories = [], categoryOrder, categoryDescriptions } = config ?? {}
  const liveWindowStart = selectedDate === todayIso ? findOpenPeriod(windows)?.start : undefined
  const nowHHMM = new Date().toTimeString().slice(0, 5)
  const { isPlannedStopMode, plannedStopTime, countdownHours } =
    selectedDate === todayIso
      ? derivePlannedStopState(windows, nowHHMM, config?.remainingTimeReference ?? 'planned-stop')
      : { isPlannedStopMode: false, plannedStopTime: null, countdownHours: 0 }
  const projectedWorkedToday =
    selectedDate === todayIso && plannedStopTime ? calculateProjectedWorkedHours(windows, nowHHMM) : undefined
  const isLeaveDay = selectedDayType === 'Vacation' || selectedDayType === 'SickDay'
  const showOfficeStats = config?.officeStats !== false
  const officeStats = showOfficeStats && totalWorkDays > 0 ? { officeDays, totalWorkDays, officePercent } : {}
  const showOvertimeBar = config?.showOvertimeBar !== false

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

      {showOvertimeBar && (
        <OvertimeBar
          sollstunden={sollstunden}
          priorOvertime={overtimeToDate.priorOvertime}
          workedToday={overtimeToDate.workedToday}
          liveWindowStart={liveWindowStart ?? null}
          plannedStopTime={plannedStopTime}
          isPlannedStopMode={isPlannedStopMode}
          countdownHours={countdownHours}
          projectedWorkedToday={projectedWorkedToday}
          remainingTimeMode={config?.remainingTimeMode ?? 'until-zero-overtime'}
          showTotalWorked={config?.showTotalWorked === true}
          onHide={() => hideOvertimeMutation.mutate()}
          {...officeStats}
        />
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <DayTypePicker date={selectedDate} dayType={selectedDayType} repository={monthRepo} />
          {showOfficeStats && (
            <button
              onClick={() => dayMutations.toggleLocation.mutate()}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
              aria-label={`Work location: ${effectiveLocation}. Click to switch to ${locationToggle}`}
            >
              <span aria-hidden="true">{locationIcon}</span> {effectiveLocation}
            </button>
          )}
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

      {isLeaveDay ? (
        <div
          role="status"
          aria-label="Leave day info"
          className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
        >
          This day counts as {sollstunden}h On Leave — no work periods expected.
        </div>
      ) : (
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
      )}
    </div>
  )
}
