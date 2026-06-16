import type { StartupView } from '../../infra/repositories/types'

const LAST_VIEW_KEY = 'timetracker-last-view'

export function getLastViewPath(): string | null {
  return localStorage.getItem(LAST_VIEW_KEY)
}

export function saveLastViewPath(path: string): void {
  localStorage.setItem(LAST_VIEW_KEY, path)
}

export function resolveStartupPath(view: StartupView | undefined, lastPath: string | null, today: string): string {
  const [year, month] = today.split('-').map(Number)
  switch (view) {
    case 'month':
      return `/month?year=${year}&month=${month}`
    case 'table':
      return `/table?year=${year}&month=${month}`
    case 'table-with-log':
      return `/table?year=${year}&month=${month}&logDate=${today}`
    case 'last':
      return lastPath ?? `/?date=${today}`
    case 'day':
    default:
      return `/?date=${today}`
  }
}
