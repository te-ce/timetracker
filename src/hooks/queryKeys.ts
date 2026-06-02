import type { QueryClient } from '@tanstack/react-query'

export function invalidateMonth(client: QueryClient, date: string): void {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  void client.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) })
}

export const QUERY_KEYS = {
  config: ['config'] as const,

  month: (year: number, month: number) => ['month', year, month] as const,
  monthAll: ['month'] as const,

  activeTracking: ['activeTracking'] as const,

  holidays: (state: string, year: number) => ['holidays', state, year] as const,

  sprintExportByIndex: (index: number) => ['sprintExport', index] as const,

  sprintEntries: (index: number, startDate: string, lengthDays: number) =>
    ['sprintEntries', index, startDate, lengthDays] as const,
}
