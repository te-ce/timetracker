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

function resolveDayCategory(date: string, dayData: Day | undefined, globalAutoCategory: string | null): string | null {
  const dayOverrides = dayData?.autoCategoryOverride
    ? new Map<string, string>([[date, dayData.autoCategoryOverride]])
    : new Map<string, string>()
  return resolveAutoCategory({ date, globalDefault: globalAutoCategory, dayOverrides })
}

function classifyDayStatus(
  date: string,
  todayIso: string,
  dayData: Day | undefined,
  workedHours: number,
  manualTotal: number,
  autoCategory: string | null,
) {
  const selectedDayType: DayType = dayData?.dayTypeOverride ?? classifyDayType(new Date(date))
  const isEntriesBalanced = workedHours > 0 && Math.abs(workedHours - manualTotal) < 0.01
  const hasAutoCategory = !!autoCategory && manualTotal <= workedHours
  const isConfirmed = dayData?.confirmed ?? false
  const dayClassification = classifyDay({ dayType: selectedDayType, workedHours, manualTotal, isEntriesBalanced, hasAutoCategory, isConfirmed, isoDate: date, today: todayIso })
  return { selectedDayType, isEntriesBalanced, hasAutoCategory, dayClassification }
}

function resolveLocation(dayData: Day | undefined, config: AppConfig | undefined): { effectiveLocation: WorkLocation; defaultWorkLocation: WorkLocation } {
  const defaultWorkLocation: WorkLocation = config?.defaultWorkLocation ?? 'Remote'
  const effectiveLocation: WorkLocation = dayData?.location ?? defaultWorkLocation
  return { effectiveLocation, defaultWorkLocation }
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
  const workedHours = calculateWorkedHours(dayData?.windows ?? [])
  const manualTotal = (dayData?.entries ?? []).reduce((sum, e) => sum + e.hours, 0)
  const overtimeToDate = calculateOvertimeToDate(workedHoursPerDay, monthDays.map((d) => d.date), todayIso, sollstunden)
  const autoCategory = resolveDayCategory(date, dayData, config?.autoCategory ?? null)
  const { selectedDayType, isEntriesBalanced, hasAutoCategory, dayClassification } = classifyDayStatus(date, todayIso, dayData, workedHours, manualTotal, autoCategory)
  const { effectiveLocation, defaultWorkLocation } = resolveLocation(dayData, config)
  return { sollstunden, workedHours, manualTotal, autoCategory, selectedDayType, isEntriesBalanced, hasAutoCategory, dayClassification, effectiveLocation, defaultWorkLocation, overtimeToDate }
}

const EMPTY_DAY: Day = { entries: [], windows: [] }

function extractDayFields(dayData: Day | undefined) {
  const day = dayData ?? EMPTY_DAY
  return {
    windows: day.windows,
    entries: day.entries,
    workLocation: day.location ?? null,
    autoCategoryOverride: day.autoCategoryOverride ?? null,
    dayTypeOverride: day.dayTypeOverride,
    isConfirmed: day.confirmed ?? false,
    dayNote: day.note ?? null,
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

  return { config, ...extractDayFields(dayData), todayIso, ...derived }
}
