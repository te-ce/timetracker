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

export interface WorkPeriodSlice {
  id: string
  category: string
  hours: number
}

export interface WorkPeriod {
  id: string
  start: string
  end: string | null
  category: string
  slices: WorkPeriodSlice[]
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
}

export interface AppConfig {
  sollstunden: number
  autoCategory: string | null
  federalState: string | null
  sprintLengthDays: number
  sprintStartDate: string | null
  customCategories: string[]
  categoryOrder?: string[]
  defaultWorkLocation?: WorkLocation | null
  sharepointUrl?: string | null
  targetSheet?: string | null
  categoryMapping?: Record<string, string>
  categoryDescriptions?: Record<string, string>
  categoryImportOrder?: string[]
  localExcelFile?: string | null
  launchAtLogin?: boolean
  startMinimized?: boolean
  closeToTray?: boolean
  hotkeys?: import('../domain/hotkeyConfig').HotkeyConfig
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
