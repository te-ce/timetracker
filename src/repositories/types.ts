export type Category =
  | 'On Leave'
  | 'Training, Events'
  | 'Coremedia'
  | 'QA'
  | 'Support'
  | 'CoPs'
  | 'Bug/Maintenance'
  | 'Infra'
  | 'Architecture'
  | 'Testwatch'

export const CATEGORIES: Category[] = [
  'On Leave',
  'Training, Events',
  'Coremedia',
  'QA',
  'Support',
  'CoPs',
  'Bug/Maintenance',
  'Infra',
  'Architecture',
  'Testwatch',
]

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
