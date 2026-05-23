import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  workPeriodRepo,
  timeEntryRepo,
  configRepo,
  workLocationRepo,
  dayConfirmationRepo,
  dayTypeOverrideRepo,
  timeTrackingRepo,
} from '../repositories/shared'
import { WorkPeriodPanel } from '../components/WorkPeriodPanel'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { OvertimeBar } from '../components/OvertimeBar'
import { DayTypePicker } from '../components/DayTypePicker'
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
    workedHours,
    manualTotal,
    autoCategory,
    dayClassification,
    effectiveLocation,
    sollstunden,
    overtimeToDate,
    todayIso,
  } = useDayQuery(selectedDate)

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

  const { displayStatus: badgeStatus, reason: statusReason } = dayClassification

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          aria-label="Previous day"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
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
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity ${selectedDate === todayIso ? 'text-gray-400 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 hover:bg-indigo-50'}`}
            onClick={() => setSelectedDate(toLocalIso(new Date()))}
            disabled={selectedDate === todayIso}
            aria-label="Go to today"
          >
            Today
          </button>
        </div>
        <button
          aria-label="Next day"
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
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
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
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
                <div className="rounded bg-gray-800 px-2 py-1 text-xs text-white shadow-lg whitespace-nowrap">
                  {statusReason}
                </div>
              </div>
            </div>
          )}
          {isConfirmed ? (
            <button
              onClick={() => unconfirmMutation.mutate()}
              className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              aria-label="Unconfirm day"
            >
              ✓ Confirmed
            </button>
          ) : (
            <button
              onClick={() => confirmMutation.mutate()}
              className="rounded border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              aria-label="Confirm day"
            >
              Confirm
            </button>
          )}
        </div>
      </div>

      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
      />

      <WorkPeriodPanel date={selectedDate} repository={workPeriodRepo} />

      <TimeEntryPanel
        date={selectedDate}
        repository={timeEntryRepo}
        timeTrackingRepository={timeTrackingRepo}
        workPeriodRepository={workPeriodRepo}
        customCategories={config?.customCategories ?? []}
        categoryOrder={config?.categoryOrder}
        autoCategory={autoCategory}
        autoCategoryHours={Math.max(0, workedHours - manualTotal)}
        onAutoCategoryChange={(cat) => autoCategoryMutation.mutate(cat)}
        onCategoryReorder={(order) => categoryReorderMutation.mutate(order)}
      />
    </div>
  )
}
