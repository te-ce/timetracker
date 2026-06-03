import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../repositories/RepositoryContext'
import { calculateOvertimeToDate, type OvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries, type DaySummary } from '../domain/daySummary'
import { toLocalIso } from '../domain/dateUtils'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'
import { QUERY_KEYS } from './queryKeys'
import { calculateTotalCategorizedHours } from '../domain/periodCategories'
import type { AppConfig, WorkLocation, WorkPeriod, DayTypeOverride, Day } from '../repositories/types'
import type { DayType } from '../domain/dayType'
import type { DayStatus } from '../domain/dayStatus'

export interface DayRawData {
  windows: WorkPeriod[]
  workLocation: WorkLocation | null
  autoCategoryOverride: string | null
  dayTypeOverride: DayTypeOverride | undefined
  isConfirmed: boolean
  dayNote: string | null
}

export interface DayConfigContext {
  sollstunden: number
  defaultWorkLocation: WorkLocation
  effectiveLocation: WorkLocation
  autoCategory: string | null
}

export interface DayComputedStats {
  workedHours: number
  manualTotal: number
  overtimeToDate: OvertimeToDate
  selectedDayType: DayType
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  dayClassification: { displayStatus: Exclude<DayStatus, 'today'>; reason: string }
}

export interface DayQueryResult extends DayRawData, DayConfigContext, DayComputedStats {
  config: AppConfig | undefined
  todayIso: string
}

const EMPTY_DAY: Day = { windows: [] }

const FUTURE_SUMMARY: DaySummary = {
  date: '',
  dayType: 'WorkDay',
  workedHours: 0,
  entryTotal: 0,
  isEntriesBalanced: false,
  hasAutoCategory: false,
  isConfirmed: false,
  dayStatus: 'future',
  displayStatus: 'future',
  statusReason: '',
}

function extractDayFields(dayData: Day | undefined): DayRawData {
  const day = dayData ?? EMPTY_DAY
  return {
    windows: day.windows,
    workLocation: day.location ?? null,
    autoCategoryOverride: day.autoCategoryOverride ?? null,
    dayTypeOverride: day.dayTypeOverride,
    isConfirmed: day.confirmed ?? false,
    dayNote: day.note ?? null,
  }
}

function resolveConfigDefaults(config: AppConfig | undefined) {
  return {
    sollstunden: config?.sollstunden ?? DEFAULT_APP_CONFIG.sollstunden,
    defaultWorkLocation: config?.defaultWorkLocation ?? 'Remote',
    globalAutoCategory: config?.autoCategory ?? null,
  }
}

function fromDaySummary(s: DaySummary): Omit<DayComputedStats, 'overtimeToDate'> {
  return {
    dayClassification: { displayStatus: s.displayStatus, reason: s.statusReason },
    workedHours: s.workedHours,
    manualTotal: s.entryTotal,
    selectedDayType: s.dayType,
    isEntriesBalanced: s.isEntriesBalanced,
    hasAutoCategory: s.hasAutoCategory,
  }
}

function resolveDayExtras(
  dayData: Day | undefined,
  config: AppConfig | undefined,
  daySummary: DaySummary,
  workedHoursPerDay: number[],
  monthDates: string[],
  todayIso: string,
): DayConfigContext & DayComputedStats {
  const { sollstunden, defaultWorkLocation, globalAutoCategory } = resolveConfigDefaults(config)
  const effectiveLocation: WorkLocation = dayData?.location ?? defaultWorkLocation
  const autoCategory = dayData?.autoCategoryOverride ?? globalAutoCategory
  const overtimeToDate = calculateOvertimeToDate(workedHoursPerDay, monthDates, todayIso, sollstunden)
  return {
    sollstunden,
    effectiveLocation,
    defaultWorkLocation,
    autoCategory,
    overtimeToDate,
    ...fromDaySummary(daySummary),
  }
}

export function useDayQuery(date: string): DayQueryResult {
  const { monthRepo, configRepo } = useRepositories()
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

  const { days: monthDays, workedHoursPerDay } = buildMonthSummaries(selectedYear, selectedMonth, {
    monthData,
    today: todayIso,
    globalAutoCategory: config?.autoCategory ?? null,
  })

  const dayData = monthData[date]
  const daySummary = monthDays.find((d) => d.date === date) ?? FUTURE_SUMMARY
  const extras = resolveDayExtras(
    dayData,
    config,
    daySummary,
    workedHoursPerDay,
    monthDays.map((d) => d.date),
    todayIso,
  )

  const manualTotal = calculateTotalCategorizedHours(dayData?.windows ?? [])

  return { config, ...extractDayFields(dayData), todayIso, ...extras, manualTotal }
}
