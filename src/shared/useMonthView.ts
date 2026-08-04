import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { composeMonthOvertime, loadOvertimeCarryOverBeforeMonth } from './monthOvertime'
import { buildMonthTable } from '../features/table/buildMonthTable'
import { useTodayIso } from './useTodayIso'
import { useAppConfigState } from './useAppConfig'
import { QUERY_KEYS } from './queryKeys'
import { nowHHMM } from './worktime'
import { deriveDayBalance, hasLiveActivity } from './dayBalance'
import { useClock } from './useClock'
import { targetHoursForDate } from './weekdayHours'
import type { DayTypeOverride, MonthData, WorkLocation, WorkPeriod } from '../infra/repositories/types'
import type { ResolvedAppConfig } from './appConfigDefaults'

interface MonthMaps {
  dayTypeOverrides: Map<string, DayTypeOverride>
  workLocations: Map<string, WorkLocation>
  dayNotes: Map<string, string>
}

/** Today's WorkPeriods, or none when the viewed month isn't the current one. */
function todayWindowsIn(monthData: MonthData, todayIso: string, year: number, month: number): WorkPeriod[] {
  const todayYear = parseInt(todayIso.slice(0, 4))
  const todayMonth = parseInt(todayIso.slice(5, 7))
  if (year !== todayYear || month !== todayMonth) return []
  return monthData[todayIso]?.windows ?? []
}

function extractMonthMaps(monthData: MonthData): MonthMaps {
  const dayTypeOverrides = new Map<string, DayTypeOverride>()
  const workLocations = new Map<string, WorkLocation>()
  const dayNotes = new Map<string, string>()
  for (const [date, day] of Object.entries(monthData)) {
    if (day.dayTypeOverride) dayTypeOverrides.set(date, day.dayTypeOverride)
    if (day.location) workLocations.set(date, day.location)
    if (day.note) dayNotes.set(date, day.note)
  }
  return { dayTypeOverrides, workLocations, dayNotes }
}

export type MonthView = ReturnType<typeof buildMonthView>

export interface MonthViewInput {
  year: number
  month: number
  monthData: MonthData
  config: ResolvedAppConfig
  todayIso: string
  /** Wall-clock "HH:MM" the live parts of the month are derived against. */
  now: string
  /** Cumulative overtime carried in from months before this one — see `loadOvertimeCarryOverBeforeMonth`. */
  priorMonthsOvertime?: number
  /** False while `priorMonthsOvertime` is still loading — see `buildMonthTable`'s `overtimeReady`. */
  overtimeReady?: boolean
}

/**
 * The month view-model: DaySummaries, grid rows, day-type/location/note maps,
 * overtime and today's balance, all derived from one MonthData against one
 * `now`. The calendar, the grid and the day view read fields off this instead
 * of re-deriving from monthData themselves.
 */
export function buildMonthView(input: MonthViewInput) {
  const { year, month, monthData, config, todayIso, now, priorMonthsOvertime = 0, overtimeReady = true } = input
  const weekdayHours = config.weekdayHours
  const sollstunden = targetHoursForDate(new Date(), weekdayHours)

  const { summaries, targetHoursPerDay, overtimeToDate } = composeMonthOvertime(
    year,
    month,
    monthData,
    config,
    todayIso,
    now,
    priorMonthsOvertime,
  )

  const { dayTypeOverrides, workLocations, dayNotes } = extractMonthMaps(monthData)
  const todayWindows = todayWindowsIn(monthData, todayIso, year, month)
  const todayBalance = deriveDayBalance({
    windows: todayWindows,
    sollstunden,
    priorOvertime: overtimeToDate.priorOvertime,
    now,
    isToday: true,
    remainingTimeReference: config.remainingTimeReference,
    remainingTimeMode: config.remainingTimeMode,
  })

  const rows = buildMonthTable({
    year,
    month,
    monthData,
    dayTypes: dayTypeOverrides,
    weekdayHours,
    today: todayIso,
    todayNow: now,
    globalAutoCategory: config.autoCategory,
    priorMonthsOvertime,
    overtimeReady,
  })

  return {
    year,
    month,
    monthData,
    rows,
    config,
    summaries,
    dayTypeOverrides,
    workLocations,
    dayNotes,
    overtimeToDate,
    sollstunden,
    targetHoursPerDay,
    todayIso,
    todayBalance,
  }
}

/** Loads the month and feeds buildMonthView from the app's clock. */
export function useMonthView(year: number, month: number) {
  const { monthRepo } = useRepositories()
  const todayIso = useTodayIso()
  const { config, isPending: isConfigPending } = useAppConfigState()

  const monthQuery = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })
  const monthData = monthQuery.data ?? {}

  const carryOverQuery = useQuery({
    queryKey: QUERY_KEYS.overtimeCarryOver(year, month),
    queryFn: () => loadOvertimeCarryOverBeforeMonth(monthRepo, year, month, config.weekdayHours),
    enabled: !isConfigPending,
  })
  const priorMonthsOvertime = carryOverQuery.data ?? 0
  const isOvertimeReady = !monthQuery.isPending && !carryOverQuery.isPending

  const todayWindows = monthData[todayIso]?.windows ?? []
  const now = useClock(hasLiveActivity(todayWindows, nowHHMM()))

  return {
    ...buildMonthView({
      year,
      month,
      monthData,
      config,
      todayIso,
      now,
      priorMonthsOvertime,
      overtimeReady: isOvertimeReady,
    }),
    isOvertimeReady,
  }
}
