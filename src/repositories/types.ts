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


export interface TimeEntry {
  id: string
  date: string
  category: string
  hours: number
}

export interface WorkPeriod {
  id: string
  date: string
  start: string
  end: string | null
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
  /** SharePoint URL of the Excel workbook used for sprint export */
  sharepointUrl?: string | null
  /** Name of the worksheet tab to write sprint data into */
  targetSheet?: string | null
  /** Maps app category keys to Excel Task IDs for export */
  categoryMapping?: Record<string, string>
  /** Filename of the Excel workbook in the local folder (local folder mode only) */
  localExcelFile?: string | null
  /** Whether to launch the app automatically on OS login (Electron desktop only) */
  launchAtLogin?: boolean
  /** Whether to start the app hidden in the tray instead of showing the window (Electron desktop only) */
  startMinimized?: boolean
  /** Whether closing the window hides to tray instead of quitting (Electron desktop only) */
  closeToTray?: boolean
  /** Global hotkey and in-app shortcut overrides */
  hotkeys?: import('../domain/hotkeyConfig').HotkeyConfig
}

export interface TimeEntryRepository {
  save(entry: TimeEntry): Promise<void>
  findByDateRange(from: Date, to: Date): Promise<TimeEntry[]>
  delete(id: string): Promise<void>
}

export interface WorkPeriodRepository {
  save(window: WorkPeriod): Promise<void>
  findByDate(date: Date): Promise<WorkPeriod[]>
  findByDateRange(from: Date, to: Date): Promise<WorkPeriod[]>
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

export interface DayConfirmationRepository {
  confirm(date: string): Promise<void>
  unconfirm(date: string): Promise<void>
  isConfirmed(date: string): Promise<boolean>
  findConfirmedInRange(from: string, to: string): Promise<Set<string>>
}

export interface ActiveTracking {
  category: string
  date: string
  startedAt: string // ISO timestamp
}

export interface TimeTrackingRepository {
  start(date: string, category: string): Promise<void>
  stop(): Promise<{ category: string; date: string; hours: number } | null>
  getActive(): Promise<ActiveTracking | null>
}
