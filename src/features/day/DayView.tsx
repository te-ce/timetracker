import { DayNoteEditor } from './DayNoteEditor'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { DayTimeline } from './DayTimeline'
import { DayTypePicker } from './DayTypePicker'
import { toLocalIso } from '../../shared/dateUtils'
import { nowHHMM } from '../../shared/worktime'
import { deriveDayBalance, hasLiveActivity } from '../../shared/dayBalance'
import { useClock } from '../../shared/useClock'
import { useDayQuery } from './useDayQuery'
import { useDayMutations } from './useDayMutations'
import { LEAVE_TYPE_LABEL } from '../../shared/leaveTypeLabel'
import { DayNav } from './DayNav'
import { DayActions } from './DayActions'

export function DayView() {
  const { monthRepo } = useRepositories()
  const navigate = useNavigate()
  const { date: selectedDate } = useSearch({ from: '/' })

  function setSelectedDate(date: string) {
    void navigate({ to: '/', search: { date } })
  }

  const {
    config,
    windows,
    autoCategoryOverride,
    dayNote,
    autoCategory,
    dayClassification,
    effectiveLocation,
    selectedDayType,
    halfDayLeave,
    sollstunden,
    overtimeToDate,
    todayIso,
    isOvertimeReady,
  } = useDayQuery(selectedDate)

  const dayMutations = useDayMutations({
    date: selectedDate,
    effectiveLocation,
    repository: monthRepo,
  })

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification
  const locationIcon = effectiveLocation === 'Office' ? '🏢' : '🏠'
  const locationToggle = effectiveLocation === 'Office' ? 'Remote' : 'Office'

  const { customCategories, categoryOrder, categoryDescriptions, preferCategoryDescriptionAsPrimary } = config
  const isLeaveDay = selectedDayType === 'Vacation' || selectedDayType === 'SickDay'
  const showOfficeStats = config.officeStats
  const isToday = selectedDate === todayIso
  const liveNow = useClock(isToday && hasLiveActivity(windows, nowHHMM()))
  const viewedDayBalance = deriveDayBalance({
    windows,
    sollstunden,
    priorOvertime: overtimeToDate.priorOvertime,
    now: liveNow,
    isToday,
    remainingTimeReference: config.remainingTimeReference,
    remainingTimeMode: config.remainingTimeMode,
  })

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

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <DayTypePicker
            date={selectedDate}
            dayType={selectedDayType}
            halfDayLeave={halfDayLeave}
            repository={monthRepo}
          />
          {showOfficeStats && (
            <button
              type="button"
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
          <DayActions badgeStatus={badgeStatus} statusReason={statusReason} />
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
          {halfDayLeave && (
            <div
              role="status"
              aria-label="Half-day leave info"
              className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
            >
              Half this day counts as {LEAVE_TYPE_LABEL[halfDayLeave]} — {sollstunden}h still expected from work
              periods.
            </div>
          )}
          <h3 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Work periods</h3>
          <DayTimeline
            date={selectedDate}
            windows={windows}
            repository={monthRepo}
            autoCategory={autoCategory ?? autoCategoryOverride}
            customCategories={customCategories}
            categoryOrder={categoryOrder}
            categoryDescriptions={categoryDescriptions}
            preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
            balance={viewedDayBalance}
            isBalanceLoading={!isOvertimeReady}
          />
        </section>
      )}
    </div>
  )
}
