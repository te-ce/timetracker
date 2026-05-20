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

/** @deprecated Use DEFAULT_CATEGORIES instead */
export const CATEGORIES = DEFAULT_CATEGORIES

export interface TimeEntry {
  id: string
  date: string
  category: string
  hours: number
}

export interface WorkWindow {
  id: string
  date: string
  start: string
  end: string
}

export interface AppConfig {
  sollstunden: number
  autoCategory: string | null
  federalState: string | null
  sprintLengthDays: number
  sprintStartDate: string | null
  customCategories: string[]
}

export interface TimeEntryRepository {
  save(entry: TimeEntry): Promise<void>
  findByDateRange(from: Date, to: Date): Promise<TimeEntry[]>
  delete(id: string): Promise<void>
}

export interface WorkWindowRepository {
  save(window: WorkWindow): Promise<void>
  findByDate(date: Date): Promise<WorkWindow[]>
  findByDateRange(from: Date, to: Date): Promise<WorkWindow[]>
  delete(id: string): Promise<void>
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

export type WorkLocation = 'Office' | 'Remote'

export interface WorkLocationRepository {
  save(date: string, location: WorkLocation): Promise<void>
  findByDate(date: string): Promise<WorkLocation | null>
  findByDateRange(from: string, to: string): Promise<Map<string, WorkLocation>>
  delete(date: string): Promise<void>
}

export type DayTypeOverride = 'PublicHoliday' | 'Vacation' | 'SickDay' | 'Absence'

export interface DayTypeOverrideRepository {
  save(date: string, dayType: DayTypeOverride): Promise<void>
  findByDate(date: string): Promise<DayTypeOverride | null>
  findByDateRange(from: string, to: string): Promise<Map<string, DayTypeOverride>>
  delete(date: string): Promise<void>
}

export interface AutoCategoryOverrideRepository {
  save(date: string, category: string): Promise<void>
  findByDate(date: string): Promise<string | null>
  findByDateRange(from: string, to: string): Promise<Map<string, string>>
  delete(date: string): Promise<void>
}
