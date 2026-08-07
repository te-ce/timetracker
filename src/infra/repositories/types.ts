export type Category =
  | '_LEAVE'
  | '_OTHER'
  | '_COREMEDIA'
  | '_RELEASE'
  | '_SUPPORT'
  | '_GUILDS'
  | '_MAINT'
  | '_INFRA'
  | '_ARCH'
  | '_TESTWATCH'

export const DEFAULT_CATEGORIES: Category[] = [
  '_LEAVE',
  '_OTHER',
  '_COREMEDIA',
  '_RELEASE',
  '_SUPPORT',
  '_GUILDS',
  '_MAINT',
  '_INFRA',
  '_ARCH',
  '_TESTWATCH',
]

export const UNCATEGORIZED_CATEGORY = '_UNCATEGORIZED'

export interface TimeEntry {
  id: string
  category: string
  hours: number
}

export interface WorkPeriodSubtask {
  id: string
  category: string
  hours: number
  startedAt?: string | undefined
  stoppedAt?: string | undefined
  note?: string | undefined
}

export interface WorkPeriod {
  id: string
  start: string
  end: string | null
  category: string
  subtasks: WorkPeriodSubtask[]
}

export const WORK_LOCATIONS = ['Office', 'Remote'] as const
export type WorkLocation = (typeof WORK_LOCATIONS)[number]

export const DAY_TYPE_OVERRIDES = ['WorkDay', 'Weekend', 'PublicHoliday', 'Vacation', 'SickDay'] as const
export type DayTypeOverride = (typeof DAY_TYPE_OVERRIDES)[number]

export const LEAVE_TYPES = ['Vacation', 'SickDay'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export interface Day {
  windows: WorkPeriod[]
  location?: WorkLocation | undefined
  note?: string | undefined
  autoCategoryOverride?: string | undefined
  dayTypeOverride?: DayTypeOverride | undefined
  /** Half of this WorkDay's target is accounted as leave; the other half can still be logged. */
  halfDayLeave?: LeaveType | undefined
}

export type MonthData = Record<string, Day>

export type DatedTimeEntry = TimeEntry & { date: string }

export interface MonthRepository {
  getMonth(year: number, month: number): Promise<MonthData>
  updateDay(date: string, updater: (current: Day) => Day): Promise<void>
  deleteMonth(year: number, month: number): Promise<void>
  restoreMonth(year: number, month: number, data: MonthData): Promise<void>
  findEntriesByDateRange(
    from: string,
    to: string,
    weekdayHours: import('../../shared/weekdayHours').WeekdayHours,
  ): Promise<DatedTimeEntry[]>
  getAllMonths(): Promise<string[]>

  // Day-level verbs
  toggleLocation(date: string, currentEffectiveLocation: WorkLocation): Promise<void>
  saveNote(date: string, note: string): Promise<void>
  resetDay(date: string): Promise<void>

  // Work period verbs
  saveWorkPeriod(date: string, window: WorkPeriod): Promise<void>
  saveWorkPeriodWithAbsorbed(date: string, window: WorkPeriod, absorbed: string[]): Promise<void>
  removeWorkPeriod(date: string, id: string): Promise<void>
  setPeriodCategory(date: string, periodId: string, category: string): Promise<void>
  addSubtask(date: string, periodId: string, subtask: WorkPeriodSubtask): Promise<void>
  removeSubtask(date: string, periodId: string, subtaskId: string): Promise<void>
  startLiveSubtask(date: string, periodId: string, subtask: WorkPeriodSubtask & { startedAt: string }): Promise<void>
  stopLiveSubtask(date: string, periodId: string, subtaskId: string, stoppedAt: string): Promise<void>
  resumeSubtask(date: string, periodId: string, subtaskId: string, now: string): Promise<void>
  stopWorkPeriod(
    date: string,
    periodId: string,
    endTime: string,
    liveSubtaskId?: string,
    stoppedAt?: string,
  ): Promise<void>

  // Multi-step tracking operations (parameterised by now to stay testable)
  openWorkPeriod(date: string, category: string, now: string): Promise<void>
  closeOpenWorkPeriod(date: string, category: string, now: string): Promise<void>
}

/**
 * AppConfig is inferred from `appConfigSchema` — the schema is the single
 * field list. Adding a field in only one of the two used to typecheck and
 * silently skip validation; now it cannot.
 */
export type { AppConfig } from './configSchema'

export const STARTUP_VIEWS = ['last', 'day', 'month', 'table', 'table-with-log'] as const
export type StartupView = (typeof STARTUP_VIEWS)[number]

export interface ConfigRepository {
  get(): Promise<import('./configSchema').AppConfig>
  save(config: import('./configSchema').AppConfig): Promise<void>
}

export interface SprintExport {
  sprintIndex: number
  status: 'pending' | 'exported'
  exportedAt: string | null
}

export interface SprintExportRepository {
  save(sprintExport: SprintExport): Promise<void>
  findBySprintIndex(sprintIndex: number): Promise<SprintExport | null>
}

export interface TrashEntry {
  id: string
  type: 'month' | 'day'
  year: number
  month: number
  date?: string
  deletedAt: string
}

export interface TrashRepository {
  moveMonthToTrash(year: number, month: number, data: MonthData): Promise<string>
  moveDayToTrash(date: string, day: Day): Promise<string>
  list(): Promise<TrashEntry[]>
  restore(id: string): Promise<void>
  purge(id: string): Promise<void>
  purgeExpired(maxAgeDays: number): Promise<void>
}
