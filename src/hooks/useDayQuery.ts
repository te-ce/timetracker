import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../repositories/RepositoryContext'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries, type DaySummary } from '../domain/daySummary'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from './queryKeys'
import type { AppConfig, WorkLocation, Day } from '../repositories/types'

const EMPTY_DAY: Day = { entries: [], windows: [] }

const FUTURE_SUMMARY: DaySummary = {
  date: '',
  dayType: 'WorkDay',
  workedHours: 0,
  entryTotal: 0,
  isEntriesBalanced: false,
  hasAutoCategory: false,
  dayStatus: 'future',
  displayStatus: 'future',
  statusReason: '',
}

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

function resolveConfigDefaults(config: AppConfig | undefined) {
  return {
    sollstunden: config?.sollstunden ?? 8,
    defaultWorkLocation: config?.defaultWorkLocation ?? 'Remote',
    globalAutoCategory: config?.autoCategory ?? null,
  }
}

function fromDaySummary(s: DaySummary) {
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
) {
  const { sollstunden, defaultWorkLocation, globalAutoCategory } = resolveConfigDefaults(config)
  const effectiveLocation: WorkLocation = dayData?.location ?? defaultWorkLocation
  const autoCategory = dayData?.autoCategoryOverride ?? globalAutoCategory
  const overtimeToDate = calculateOvertimeToDate(workedHoursPerDay, monthDates, todayIso, sollstunden)
  return { sollstunden, effectiveLocation, defaultWorkLocation, autoCategory, overtimeToDate, ...fromDaySummary(daySummary) }
}

export function useDayQuery(date: string) {
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
  const extras = resolveDayExtras(dayData, config, daySummary, workedHoursPerDay, monthDays.map((d) => d.date), todayIso)

  return { config, ...extractDayFields(dayData), todayIso, ...extras }
}
