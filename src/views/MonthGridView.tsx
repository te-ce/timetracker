import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { timeEntryRepo, workWindowRepo, configRepo, dayTypeOverrideRepo, dayConfirmationRepo, workLocationRepo } from '../repositories/shared'
import { MonthGrid } from '../components/MonthGrid'
import { OvertimeBar } from '../components/OvertimeBar'
import { AutoCategoryPicker } from '../components/AutoCategoryPicker'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import { toLocalIso } from '../domain/dateUtils'

export function MonthGridView() {
  const today = new Date()
  const todayIso = toLocalIso(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  const fromIso = toLocalIso(from)
  const toIso = toLocalIso(to)

  const { data: dayTypeOverrides = new Map() } = useQuery({
    queryKey: ['dayTypeOverrides', year, month],
    queryFn: () => dayTypeOverrideRepo.findByDateRange(fromIso, toIso),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', year, month, 'grid'],
    queryFn: () => workWindowRepo.findByDateRange(from, to),
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', year, month, 'grid'],
    queryFn: () => timeEntryRepo.findByDateRange(from, to),
  })

  const { data: confirmedDays = new Set<string>() } = useQuery({
    queryKey: ['dayConfirmations', year, month],
    queryFn: () => dayConfirmationRepo.findConfirmedInRange(fromIso, toIso),
  })

  const { data: workLocations = new Map() } = useQuery({
    queryKey: ['workLocations', year, month],
    queryFn: () => workLocationRepo.findByDateRange(fromIso, toIso),
  })

  const sollstunden = config?.sollstunden ?? 8

  const { days, workedHoursPerDay } = buildMonthSummaries(year, month, {
    windows,
    entries,
    dayTypeOverrides,
    today: todayIso,
    confirmedDays,
  })
  const dates = days.map((d) => d.date)
  const toDate = calculateOvertimeToDate(workedHoursPerDay, dates, todayIso, sollstunden)

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">←</button>
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <button onClick={nextMonth} className="rounded border px-3 py-1 text-sm hover:bg-gray-100">→</button>
        <button
          onClick={() => { const now = new Date(); setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}
          className="rounded border px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Today
        </button>
        <div className="ml-auto">
          <AutoCategoryPicker />
        </div>
      </div>
      <OvertimeBar overtimeToDate={toDate.value} hoursNeededToday={toDate.hoursNeededToday} />
      <MonthGrid
        year={year}
        month={month}
        timeEntryRepository={timeEntryRepo}
        workWindowRepository={workWindowRepo}
        dayConfirmationRepository={dayConfirmationRepo}
        dayTypeOverrideRepository={dayTypeOverrideRepo}
        workLocationRepository={workLocationRepo}
        autoCategory={config?.autoCategory ?? '_COREMEDIA'}
        customCategories={config?.customCategories ?? []}
        categoryOrder={config?.categoryOrder}
        dayTypes={dayTypeOverrides}
        confirmedDays={confirmedDays}
        sprintStartDate={config?.sprintStartDate ?? null}
        sprintLengthDays={config?.sprintLengthDays ?? 14}
        workLocations={workLocations}
      />
    </div>
  )
}
