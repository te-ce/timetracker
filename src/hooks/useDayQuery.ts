import { useQuery } from '@tanstack/react-query'
import { monthRepo, configRepo } from '../repositories/shared'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import { resolveAutoCategory } from '../domain/autoCategoryOverride'
import { classifyDay as classifyDayType } from '../domain/dayType'
import { classifyDay } from '../domain/dayStatus'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from './queryKeys'
import type { AppConfig, WorkLocation, Day } from '../repositories/types'
import type { DayClassification } from '../domain/dayStatus'
import type { DayType } from '../domain/dayType'

interface DayDerived {
  sollstunden: number
  workedHours: number
  manualTotal: number
  autoCategory: string | null
  selectedDayType: DayType
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  dayClassification: DayClassification
  effectiveLocation: WorkLocation
  defaultWorkLocation: WorkLocation
  overtimeToDate: ReturnType<typeof calculateOvertimeToDate>
}

function computeDayDerived(
  config: AppConfig | undefined,
  date: string,
  todayIso: string,
  workedHoursPerDay: number[],
  monthDays: Array<{ date: string }>,
  dayData: Day | undefined,
): DayDerived {
  const sollstunden = config?.sollstunden ?? 8
  const windows = dayData?.windows ?? []
  const entries = dayData?.entries ?? []
  const workedHours = calculateWorkedHours(windows)
  const manualTotal = entries.reduce((sum, e) => sum + e.hours, 0)

  const overtimeToDate = calculateOvertimeToDate(
    workedHoursPerDay,
    monthDays.map((d) => d.date),
    todayIso,
    sollstunden,
  )

  const globalAutoCategory = config?.autoCategory ?? null
  const autoCategory = resolveAutoCategory({
    date,
    globalDefault: globalAutoCategory,
    dayOverrides: dayData?.autoCategoryOverride
      ? new Map<string, string>([[date, dayData.autoCategoryOverride]])
      : new Map<string, string>(),
  })

  const selectedDayType: DayType = dayData?.dayTypeOverride ?? classifyDayType(new Date(date))
  const isEntriesBalanced = workedHours > 0 && Math.abs(workedHours - manualTotal) < 0.01
  const hasAutoCategory = !!autoCategory && manualTotal <= workedHours
  const isConfirmed = dayData?.confirmed ?? false

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
  const effectiveLocation: WorkLocation = dayData?.location ?? defaultWorkLocation

  return {
    sollstunden,
    workedHours,
    manualTotal,
    autoCategory,
    selectedDayType,
    isEntriesBalanced,
    hasAutoCategory,
    dayClassification,
    effectiveLocation,
    defaultWorkLocation,
    overtimeToDate,
  }
}

export function useDayQuery(date: string) {
  const todayIso = toLocalIso(new Date())
  const selectedYear = parseInt(date.slice(0, 4))
  const selectedMonth = parseInt(date.slice(5, 7))

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(selectedYear, selectedMonth),
    queryFn: () => monthRepo.getMonth(selectedYear, selectedMonth),
  })

  const dayData = monthData[date]

  const { days: monthDays, workedHoursPerDay } = buildMonthSummaries(selectedYear, selectedMonth, {
    monthData,
    today: todayIso,
    globalAutoCategory: config?.autoCategory ?? null,
  })

  const derived = computeDayDerived(config, date, todayIso, workedHoursPerDay, monthDays, dayData)

  return {
    config,
    windows: dayData?.windows ?? [],
    entries: dayData?.entries ?? [],
    workLocation: dayData?.location ?? null,
    autoCategoryOverride: dayData?.autoCategoryOverride ?? null,
    dayTypeOverride: dayData?.dayTypeOverride,
    isConfirmed: dayData?.confirmed ?? false,
    dayNote: dayData?.note ?? null,
    todayIso,
    ...derived,
  }
}
