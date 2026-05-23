import { useQuery } from '@tanstack/react-query'
import {
  workPeriodRepo,
  timeEntryRepo,
  configRepo,
  workLocationRepo,
  dayTypeOverrideRepo,
  autoCategoryOverrideRepo,
  dayConfirmationRepo,
} from '../repositories/shared'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import { resolveAutoCategory } from '../domain/autoCategoryOverride'
import { classifyDay as classifyDayType } from '../domain/dayType'
import { classifyDay } from '../domain/dayStatus'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from './queryKeys'
import type { DayTypeOverride, WorkLocation } from '../repositories/types'

export function useDayQuery(date: string) {
  const todayIso = toLocalIso(new Date())
  const selectedYear = parseInt(date.slice(0, 4))
  const selectedMonth = parseInt(date.slice(5, 7))
  const monthFrom = new Date(selectedYear, selectedMonth - 1, 1)
  const monthTo = new Date(selectedYear, selectedMonth, 0)
  const monthFromIso = toLocalIso(monthFrom)
  const monthToIso = toLocalIso(monthTo)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: windows = [] } = useQuery({
    queryKey: QUERY_KEYS.workWindowsByDate(date),
    queryFn: () => workPeriodRepo.findByDate(new Date(date)),
  })

  const { data: entries = [] } = useQuery({
    queryKey: QUERY_KEYS.timeEntriesByDate(date),
    queryFn: () => {
      const d = new Date(date)
      return timeEntryRepo.findByDateRange(d, d)
    },
  })

  const { data: workLocation = null } = useQuery({
    queryKey: QUERY_KEYS.workLocationByDate(date),
    queryFn: () => workLocationRepo.findByDate(date),
  })

  const { data: autoCategoryOverride = null } = useQuery({
    queryKey: QUERY_KEYS.autoCategoryOverrideByDate(date),
    queryFn: () => autoCategoryOverrideRepo.findByDate(date),
  })

  const { data: isConfirmed = false } = useQuery({
    queryKey: QUERY_KEYS.dayConfirmationByDate(date),
    queryFn: () => dayConfirmationRepo.isConfirmed(date),
  })

  const { data: monthConfirmedDays = new Set<string>() } = useQuery({
    queryKey: QUERY_KEYS.dayConfirmationsByMonth(selectedYear, selectedMonth),
    queryFn: () => dayConfirmationRepo.findConfirmedInRange(toLocalIso(monthFrom), toLocalIso(monthTo)),
  })

  const { data: monthWindows = [] } = useQuery({
    queryKey: QUERY_KEYS.workWindowsByMonthTagged(selectedYear, selectedMonth, 'dayOvertime'),
    queryFn: () => workPeriodRepo.findByDateRange(monthFrom, monthTo),
  })

  const { data: monthEntries = [] } = useQuery({
    queryKey: QUERY_KEYS.timeEntriesByMonthTagged(selectedYear, selectedMonth, 'dayOvertime'),
    queryFn: () => timeEntryRepo.findByDateRange(monthFrom, monthTo),
  })

  const { data: monthDayTypeOverrides = new Map<string, DayTypeOverride>() } = useQuery({
    queryKey: QUERY_KEYS.dayTypeOverridesByMonthTagged(selectedYear, selectedMonth, 'dayOvertime'),
    queryFn: () => dayTypeOverrideRepo.findByDateRange(monthFromIso, monthToIso),
  })

  // Derived values
  const sollstunden = config?.sollstunden ?? 8
  const workedHours = calculateWorkedHours(windows)
  const manualTotal = entries.reduce((sum, e) => sum + e.hours, 0)

  const { days: monthDays, workedHoursPerDay } = buildMonthSummaries(selectedYear, selectedMonth, {
    windows: monthWindows,
    entries: monthEntries,
    dayTypeOverrides: monthDayTypeOverrides,
    today: todayIso,
    confirmedDays: monthConfirmedDays,
  })
  const overtimeToDate = calculateOvertimeToDate(
    workedHoursPerDay,
    monthDays.map((d) => d.date),
    todayIso,
    sollstunden,
  )

  const dayOverrides = new Map<string, string>()
  if (autoCategoryOverride) dayOverrides.set(date, autoCategoryOverride)
  const autoCategory = resolveAutoCategory({
    date,
    globalDefault: config?.autoCategory ?? null,
    dayOverrides,
  })

  const selectedDayType = monthDayTypeOverrides.get(date) ?? classifyDayType(new Date(date))
  const isEntriesBalanced = workedHours > 0 && Math.abs(workedHours - manualTotal) < 0.01
  const hasAutoCategory = !!autoCategory && manualTotal <= workedHours
  const dayClassification = classifyDay({
    dayType: selectedDayType,
    workedHours,
    manualTotal,
    isEntriesBalanced,
    hasAutoCategory,
    isConfirmed,
    isoDate: date,
    today: todayIso,
  })

  const defaultWorkLocation: WorkLocation = config?.defaultWorkLocation ?? 'Remote'
  const effectiveLocation: WorkLocation = workLocation ?? defaultWorkLocation

  return {
    config,
    windows,
    entries,
    workLocation,
    autoCategoryOverride,
    isConfirmed,
    workedHours,
    manualTotal,
    autoCategory,
    selectedDayType,
    isEntriesBalanced,
    hasAutoCategory,
    dayClassification,
    effectiveLocation,
    defaultWorkLocation,
    sollstunden,
    overtimeToDate,
    todayIso,
  }
}
