import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { workWindowRepo, timeEntryRepo, configRepo, workLocationRepo, dayTypeOverrideRepo, autoCategoryOverrideRepo, dayConfirmationRepo } from '../repositories/shared'
import { WorkWindowPanel } from '../components/WorkWindowPanel'
import { TimeEntryPanel } from '../components/TimeEntryPanel'
import { OvertimeBar } from '../components/OvertimeBar'
import { AutoCategoryPicker } from '../components/AutoCategoryPicker'
import { DayTypePicker } from '../components/DayTypePicker'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateRestarbeitszeit } from '../domain/worktime'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import { resolveAutoCategory } from '../domain/autoCategoryOverride'
import { toLocalIso } from '../domain/dateUtils'
import type { WorkLocation } from '../repositories/types'

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
    queryFn: () => workWindowRepo.findByDate(new Date(selectedDate)),
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
    mutationFn: (confirmed: boolean) =>
      confirmed ? dayConfirmationRepo.confirm(selectedDate) : dayConfirmationRepo.unconfirm(selectedDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmation', selectedDate] })
      void queryClient.invalidateQueries({ queryKey: ['dayConfirmations'] })
    },
  })

  const sollstunden = config?.sollstunden ?? 8
  const workedHours = calculateWorkedHours(windows)
  const manualTotal = entries.reduce((sum, e) => sum + e.hours, 0)
  const restarbeitszeit = calculateRestarbeitszeit(sollstunden, workedHours)

  // Month-level overtime calculation
  const selectedYear = parseInt(selectedDate.slice(0, 4))
  const selectedMonth = parseInt(selectedDate.slice(5, 7))
  const monthFrom = new Date(selectedYear, selectedMonth - 1, 1)
  const monthTo = new Date(selectedYear, selectedMonth, 0)
  const monthFromIso = toLocalIso(monthFrom)
  const monthToIso = toLocalIso(monthTo)

  const { data: monthWindows = [] } = useQuery({
    queryKey: ['workWindows', selectedYear, selectedMonth, 'dayOvertime'],
    queryFn: () => workWindowRepo.findByDateRange(monthFrom, monthTo),
  })

  const { data: monthEntries = [] } = useQuery({
    queryKey: ['timeEntries', selectedYear, selectedMonth, 'dayOvertime'],
    queryFn: () => timeEntryRepo.findByDateRange(monthFrom, monthTo),
  })

  const { data: monthDayTypeOverrides = new Map() } = useQuery({
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

  function handleLocationToggle() {
    const next: WorkLocation | null =
      workLocation === null ? 'Office' : workLocation === 'Office' ? 'Remote' : null
    if (next) {
      void workLocationRepo.save(selectedDate, next)
    } else {
      void workLocationRepo.delete(selectedDate)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() - 1)
            setSelectedDate(toLocalIso(d))
          }}
        >
          ← Prev
        </button>
        <h2 className="text-xl font-semibold">{formatDate(selectedDate)}</h2>
        <button
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
          onClick={() => {
            const d = new Date(selectedDate)
            d.setDate(d.getDate() + 1)
            setSelectedDate(toLocalIso(d))
          }}
        >
          Next →
        </button>
        <button
          className="rounded border px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          onClick={() => setSelectedDate(toLocalIso(new Date()))}
        >
          Today
        </button>
      </div>

      <div className="flex items-center gap-4">
        <DayTypePicker date={selectedDate} repository={dayTypeOverrideRepo} />
        <button
          onClick={handleLocationToggle}
          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
          aria-label="Work location"
        >
          {workLocation === 'Office' ? '🏢 Office' : workLocation === 'Remote' ? '🏠 Remote' : '📍 Set location'}
        </button>
        <AutoCategoryPicker />
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => confirmMutation.mutate(e.target.checked)}
            className="rounded border-gray-300"
            aria-label="Confirm day"
          />
          <span className="text-gray-600">Confirmed</span>
        </label>
        {workedHours > 0 && (
          <span className={`text-sm font-medium ${restarbeitszeit.isOvertime ? 'text-green-600' : 'text-amber-600'}`}>
            {restarbeitszeit.isOvertime ? 'Overtime' : 'Remaining'}: {Math.abs(restarbeitszeit.value).toFixed(2)}h
          </span>
        )}
      </div>

      <OvertimeBar overtimeToDate={overtimeToDate.value} hoursNeededToday={overtimeToDate.hoursNeededToday} />

      <WorkWindowPanel
        date={selectedDate}
        sollstunden={sollstunden}
        repository={workWindowRepo}
      />

      <TimeEntryPanel
        date={selectedDate}
        repository={timeEntryRepo}
        customCategories={config?.customCategories ?? []}
        categoryOrder={config?.categoryOrder}
        autoCategory={autoCategory}
        autoCategoryHours={Math.max(0, workedHours - manualTotal)}
      />
    </div>
  )
}
