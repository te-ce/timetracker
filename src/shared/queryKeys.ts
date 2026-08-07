import type { QueryClient } from '@tanstack/react-query'
import { parseLocalDate } from './dateUtils'

export function invalidateMonth(client: QueryClient, date: string): void {
  const d = parseLocalDate(date)
  void client.invalidateQueries({ queryKey: QUERY_KEYS.month(d.getFullYear(), d.getMonth() + 1) })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.overtimeCarryOverAll })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.allMonthsData })
}

export function invalidateMonthByYearMonth(client: QueryClient, year: number, month: number): void {
  void client.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.overtimeCarryOverAll })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.allMonthsData })
}

export function invalidateMonthAll(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: QUERY_KEYS.monthAll })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.overtimeCarryOverAll })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.allMonthsData })
}

export function invalidateConfig(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: QUERY_KEYS.config })
}

export function invalidateSprintExport(client: QueryClient, index: number): void {
  void client.invalidateQueries({ queryKey: QUERY_KEYS.sprintExportByIndex(index) })
}

export function invalidateTrash(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: QUERY_KEYS.trash })
  void client.invalidateQueries({ queryKey: QUERY_KEYS.trashBackups })
}

export const QUERY_KEYS = {
  config: ['config'] as const,

  month: (year: number, month: number) => ['month', year, month] as const,
  monthAll: ['month'] as const,

  allMonthsData: ['allMonthsData'] as const,

  overtimeCarryOver: (year: number, month: number) => ['overtimeCarryOver', year, month] as const,
  overtimeCarryOverAll: ['overtimeCarryOver'] as const,

  holidays: (state: string, year: number) => ['holidays', state, year] as const,

  sprintExportByIndex: (index: number) => ['sprintExport', index] as const,

  sprintEntries: (index: number, startDate: string, lengthDays: number) =>
    ['sprintEntries', index, startDate, lengthDays] as const,

  trash: ['trash'] as const,
  trashBackups: ['trashBackups'] as const,
}
