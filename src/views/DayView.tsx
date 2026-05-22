import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  workPeriodRepo,
  timeEntryRepo,
  configRepo,
  workLocationRepo,
  dayTypeOverrideRepo,
  autoCategoryOverrideRepo,
  dayConfirmationRepo,
  timeTrackingRepo,
} from '../repositories/shared'
import { WorkPeriodPanel } from '../components/WorkPeriodPanel'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { OvertimeBar } from '../components/OvertimeBar'
import { DayTypePicker } from '../components/DayTypePicker'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import { resolveAutoCategory } from '../domain/autoCategoryOverride'
import { toLocalIso } from '../domain/dateUtils'
import { getDayStatus, getStatusReason, type DayStatus } from '../domain/dayStatus'
import { classifyDay } from '../domain/dayType'
import type { DayTypeOverride, WorkLocation } from '../repositories/types'

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

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', selectedDate],
    queryFn: () => workPeriodRepo.findByDate(new Date(selectedDate)),
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', selectedDate],
    queryFn: () => {
      const d = new Date(selectedDate)
      return timeEntryRepo.findByDateRange(d, d)
    },
  })

  const { data: workLocation = null } = useQuery({
    queryKey: ['workLocation', selectedDate],
    queryFn: () => workLocationRepo.findByDate(selectedDate),
  })

  const { data: autoCategoryOverride = null } = useQuery({
    queryKey: ['autoCategoryOverride', selectedDate],
    queryFn: () => autoCategoryOverrideRepo.findByDate(selectedDate),
  })

  const { data: isConfirmed = false } = useQuery({
    queryKey: ['dayConfirmation', selectedDate],
    queryFn: () => dayConfirmationRepo.isConfirmed(selectedDate),
  })

  const { data: monthConfirmedDays = new Set<string>() } = useQuery({
    queryKey: ['dayConfirmations', parseInt(selectedDate.slice(0, 4)), parseInt(selectedDate.slice(5, 7))],
    queryFn: () => {
      const y = parseInt(selectedDate.slice(0, 4))
      const m = parseInt(selectedDate.slice(5, 7))
      const mFrom = toLocalIso(new Date(y, m - 1, 1))
      const mTo = toLocalIso(new Date(y, m, 0))
      return dayConfirmationRepo.findConfirmedInRange(mFrom, mTo)
    },
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
      // Persist auto hours as a real time entry
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
      void queryClient.invalidateQueries({
        queryKey: ['dayConfirmation', selectedDate],
      })
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmations'] })
      void queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
    },
  })

  const unconfirmMutation = useMutation({
    mutationFn: () => dayConfirmationRepo.unconfirm(selectedDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['dayConfirmation', selectedDate],
      })
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmations'] })
    },
  })

  const sollstunden = config?.sollstunden ?? 8
  const workedHours = calculateWorkedHours(windows)
  const manualTotal = entries.reduce((sum, e) => sum + e.hours, 0)

  // Month-level overtime calculation
  const selectedYear = parseInt(selectedDate.slice(0, 4))
  const selectedMonth = parseInt(selectedDate.slice(5, 7))
  const monthFrom = new Date(selectedYear, selectedMonth - 1, 1)
  const monthTo = new Date(selectedYear, selectedMonth, 0)
  const monthFromIso = toLocalIso(monthFrom)
  const monthToIso = toLocalIso(monthTo)

  const { data: monthWindows = [] } = useQuery({
    queryKey: ['workWindows', selectedYear, selectedMonth, 'dayOvertime'],
    queryFn: () => workPeriodRepo.findByDateRange(monthFrom, monthTo),
  })

  const { data: monthEntries = [] } = useQuery({
    queryKey: ['timeEntries', selectedYear, selectedMonth, 'dayOvertime'],
    queryFn: () => timeEntryRepo.findByDateRange(monthFrom, monthTo),
  })

  const { data: monthDayTypeOverrides = new Map<string, DayTypeOverride>() } = useQuery({
    queryKey: ['dayTypeOverrides', selectedYear, selectedMonth, 'dayOvertime'],
    queryFn: () => dayTypeOverrideRepo.findByDateRange(monthFromIso, monthToIso),
  })

  const todayIso = toLocalIso(new Date())
  const { days: monthDays, workedHoursPerDay } = buildMonthSummaries(selectedYear, selectedMonth, {
    windows: monthWindows,
    entries: monthEntries,
    dayTypeOverrides: monthDayTypeOverrides,
    today: todayIso,
    confirmedDays: monthConfirmedDays,
  })
  const monthDates = monthDays.map((d) => d.date)
  const overtimeToDate = calculateOvertimeToDate(workedHoursPerDay, monthDates, todayIso, sollstunden)

  const dayOverrides = new Map<string, string>()
  if (autoCategoryOverride) dayOverrides.set(selectedDate, autoCategoryOverride)

  const autoCategory = resolveAutoCategory({
    date: selectedDate,
    globalDefault: config?.autoCategory ?? null,
    dayOverrides,
  })

  const defaultWorkLocation: WorkLocation = config?.defaultWorkLocation ?? 'Remote'
  const effectiveLocation: WorkLocation = workLocation ?? defaultWorkLocation

  const selectedDayType = monthDayTypeOverrides.get(selectedDate) ?? classifyDay(new Date(selectedDate))
  const isEntriesBalanced = workedHours > 0 && Math.abs(workedHours - manualTotal) < 0.01
  const hasAutoCategory = !!autoCategory && manualTotal <= workedHours
  const dayStatus = getDayStatus({
    dayType: selectedDayType,
    hasWorkedHours: workedHours > 0,
    hasManualEntries: manualTotal > 0,
    isEntriesBalanced,
    hasAutoCategory,
    isConfirmed,
    isoDate: selectedDate,
    today: todayIso,
  })

  const STATUS_BADGE: Record<Exclude<DayStatus, 'today'>, { bg: string; text: string; label: string }> = {
    complete: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Complete' },
    'needs-review': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Needs review' },
    untracked: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Untracked' },
    future: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Future' },
    'non-working': { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Non-working' },
    leave: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Leave' },
  }

  const statusReason = getStatusReason({
    dayType: selectedDayType,
    workedHours,
    manualTotal,
    hasAutoCategory,
    isConfirmed,
    isoDate: selectedDate,
    today: todayIso,
  })

  // For today, resolve the actual work status instead of showing "Today"
  const badgeStatus: Exclude<DayStatus, 'today'> | null = (() => {
    if (dayStatus !== 'today') return dayStatus
    if (!workedHours && !manualTotal) return null
    if (!workedHours) return 'needs-review'
    if (isEntriesBalanced || hasAutoCategory) return 'complete'
    return 'needs-review'
  })()

  const autoCategoryMutation = useMutation({
    mutationFn: (cat: string | null) => configRepo.save({ ...config!, autoCategory: cat }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  const categoryReorderMutation = useMutation({
    mutationFn: (categoryOrder: string[]) => configRepo.save({ ...config!, categoryOrder }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  const locationMutation = useMutation({
    mutationFn: async () => {
      const next: WorkLocation = effectiveLocation === 'Remote' ? 'Office' : 'Remote'
      await workLocationRepo.save(selectedDate, next)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['workLocation', selectedDate],
      })
      void queryClient.invalidateQueries({ queryKey: ['workLocations'] })
    },
  })

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
          {badgeStatus !== null && badgeStatus !== 'future' && (
            <div className="group relative">
              <span
                className={`cursor-help rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[badgeStatus].bg} ${STATUS_BADGE[badgeStatus].text}`}
              >
                {STATUS_BADGE[badgeStatus].label}
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
