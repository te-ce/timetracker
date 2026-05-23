import { useQuery } from '@tanstack/react-query'
import {
  workPeriodRepo,
  timeEntryRepo,
  configRepo,
  dayTypeOverrideRepo,
  dayConfirmationRepo,
  workLocationRepo,
} from '../repositories/shared'
import { buildMonthSummaries } from '../domain/daySummary'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from './queryKeys'
import type { DayTypeOverride, WorkLocation } from '../repositories/types'

export function useMonthQuery(year: number, month: number) {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  const fromIso = toLocalIso(from)
  const toIso = toLocalIso(to)
  const todayIso = toLocalIso(new Date())

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: windows = [] } = useQuery({
    queryKey: QUERY_KEYS.workWindowsByMonthTagged(year, month, 'month'),
    queryFn: () => workPeriodRepo.findByDateRange(from, to),
  })

  const { data: entries = [] } = useQuery({
    queryKey: QUERY_KEYS.timeEntriesByMonthTagged(year, month, 'month'),
    queryFn: () => timeEntryRepo.findByDateRange(from, to),
  })

  const { data: dayTypeOverrides = new Map<string, DayTypeOverride>() } = useQuery({
    queryKey: QUERY_KEYS.dayTypeOverridesByMonth(year, month),
    queryFn: () => dayTypeOverrideRepo.findByDateRange(fromIso, toIso),
  })

  const { data: confirmedDays = new Set<string>() } = useQuery({
    queryKey: QUERY_KEYS.dayConfirmationsByMonth(year, month),
    queryFn: () => dayConfirmationRepo.findConfirmedInRange(fromIso, toIso),
  })

  const { data: workLocations = new Map<string, WorkLocation>() } = useQuery({
    queryKey: QUERY_KEYS.workLocationsByMonth(year, month),
    queryFn: () => workLocationRepo.findByDateRange(fromIso, toIso),
  })

  const sollstunden = config?.sollstunden ?? 8

  const summaries = buildMonthSummaries(year, month, {
    windows,
    entries,
    dayTypeOverrides,
    today: todayIso,
    confirmedDays,
  })

  const overtimeToDate = calculateOvertimeToDate(
    summaries.workedHoursPerDay,
    summaries.days.map((d) => d.date),
    todayIso,
    sollstunden,
  )

  const trackedWorkDays = summaries.days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = trackedWorkDays.length > 0 ? Math.round((officeDays / trackedWorkDays.length) * 100) : 0

  return {
    config,
    summaries,
    dayTypeOverrides,
    workLocations,
    confirmedDays,
    overtimeToDate,
    trackedWorkDays,
    officeDays,
    officePercent,
    sollstunden,
    todayIso,
  }
}
