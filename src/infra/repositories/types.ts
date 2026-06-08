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

export type WorkLocation = 'Office' | 'Remote'

export type DayTypeOverride = 'PublicHoliday' | 'Vacation' | 'SickDay' | 'Absence'

export interface Day {
  windows: WorkPeriod[]
  location?: WorkLocation
  confirmed?: boolean
  note?: string
  autoCategoryOverride?: string
  dayTypeOverride?: DayTypeOverride
}

export type MonthData = Record<string, Day>

export type DatedTimeEntry = TimeEntry & { date: string }

export interface MonthRepository {
  getMonth(year: number, month: number): Promise<MonthData>
  updateDay(date: string, updater: (current: Day) => Day): Promise<void>
  deleteMonth(year: number, month: number): Promise<void>
  findEntriesByDateRange(from: string, to: string): Promise<DatedTimeEntry[]>
  getAllMonths(): Promise<string[]>

  // Day-level verbs
  confirmDay(date: string): Promise<void>
  unconfirmDay(date: string): Promise<void>
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

export interface AppConfig {
  weekdayHours: import('../../shared/weekdayHours').WeekdayHours
  autoCategory: string | null
  federalState: string | null
  sprintLengthDays: number
  sprintStartDate: string | null
  customCategories: string[]
  categoryOrder?: string[] | undefined
  defaultWorkLocation?: WorkLocation | null | undefined
  sharepointUrl?: string | null | undefined
  targetSheet?: string | null | undefined
  categoryMapping?: Record<string, string> | undefined
  categoryDescriptions?: Record<string, string> | undefined
  categoryImportOrder?: string[] | undefined
  localExcelFile?: string | null | undefined
  launchAtLogin?: boolean | undefined
  startMinimized?: boolean | undefined
  closeToTray?: boolean | undefined
  hotkeys?: import('../../shared/hotkeyConfig').HotkeyConfig | undefined
  showOvertimeBar?: boolean | undefined
}

export interface ConfigRepository {
  get(): Promise<AppConfig>
  save(config: AppConfig): Promise<void>
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

export interface ActiveTracking {
  category: string
  date: string
  startedAt: string
}

export interface TimeTrackingRepository {
  start(date: string, category: string): Promise<void>
  stop(): Promise<{ category: string; date: string; hours: number } | null>
  getActive(): Promise<ActiveTracking | null>
}
