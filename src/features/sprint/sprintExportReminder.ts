import { getSprintBoundaries, getSprintForDate, sprintDayProgress } from './sprint'
import type { Sprint, SprintConfig } from './sprint'

export interface SprintReminderData {
  index: number
  totalHours: number
  exportStatus: 'pending' | 'exported' | null
}

export function getSprintsNeedingExport(today: string, config: SprintConfig, data: SprintReminderData[]): Sprint[] {
  const currentIndex = getSprintForDate(today, config).index
  const result: Sprint[] = []

  for (const d of data) {
    if (d.index < currentIndex - 6) continue
    if (d.totalHours <= 0) continue
    if (d.exportStatus === 'exported') continue
    const sprint = getSprintBoundaries(d.index, config)
    if (today < sprint.end) continue
    result.push(sprint)
  }

  return result.sort((a, b) => a.index - b.index)
}

export function sprintExportBadgeLabel(sprints: Sprint[]): string {
  if (sprints.length === 1 && sprints[0]) return `Export Sprint ${sprints[0].index + 1}`
  return 'Export Sprints'
}

export function sprintExportTooltipText(sprints: Sprint[]): string | null {
  if (sprints.length <= 1) return null
  return `Sprint ${sprints.map((s) => s.index + 1).join(', ')}`
}

export type SprintBadgeState = { kind: 'export'; sprints: Sprint[] } | { kind: 'countdown'; daysLeft: number }

export function getSprintBadgeState(today: string, config: SprintConfig, data: SprintReminderData[]): SprintBadgeState {
  const sprintsNeedingExport = getSprintsNeedingExport(today, config, data)
  if (sprintsNeedingExport.length > 0) return { kind: 'export', sprints: sprintsNeedingExport }

  const currentSprint = getSprintForDate(today, config)
  const { day, total } = sprintDayProgress(currentSprint, today)
  return { kind: 'countdown', daysLeft: total - day }
}

export function sprintCountdownLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Sprint ends today'
  if (daysLeft === 1) return '1 day left in sprint'
  return `${daysLeft} days left in sprint`
}

export function dispatchSprintExportNotification(indices: number[]): void {
  const first = indices[0]
  const body =
    indices.length === 1 && first !== undefined
      ? `Sprint ${first + 1} ended, export your hours`
      : `Sprint ${indices.map((i) => i + 1).join(', ')} ended, export your hours`
  if (window.electronAPI) {
    window.electronAPI.notify.sprintExportDue(body)
  } else if ('Notification' in window) {
    void Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification('Timetracker', { body })
    })
  }
}

export const SPRINT_EXPORT_NOTIFY_KEY = 'sprint-export-notified'

interface StoredExportNotification {
  date: string
  indices: unknown[]
}

function parseStoredExportNotification(stored: string): StoredExportNotification | null {
  try {
    const raw: unknown = JSON.parse(stored)
    if (typeof raw !== 'object' || raw === null) return null
    if (!('date' in raw) || !('indices' in raw)) return null
    if (typeof raw.date !== 'string' || !Array.isArray(raw.indices)) return null
    return { date: raw.date, indices: raw.indices }
  } catch {
    return null
  }
}

export function shouldNotifyToday(today: string, indices: number[], stored: string | null): boolean {
  if (!stored) return true
  const parsed = parseStoredExportNotification(stored)
  if (!parsed) return true
  if (parsed.date !== today) return true
  const same = parsed.indices.length === indices.length && indices.every((v, i) => parsed.indices[i] === v)
  return !same
}
