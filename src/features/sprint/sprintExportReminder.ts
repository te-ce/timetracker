import { getSprintBoundaries, getSprintForDate } from './sprint'
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
  if (sprints.length === 1 && sprints[0]) return `Export Sprint ${sprints[0].index}`
  return 'Export Sprints'
}

export function sprintExportTooltipText(sprints: Sprint[]): string | null {
  if (sprints.length <= 1) return null
  return `Sprint ${sprints.map((s) => s.index).join(', ')}`
}

export function dispatchSprintExportNotification(indices: number[]): void {
  const body =
    indices.length === 1
      ? `Sprint ${indices[0]} ended, export your hours`
      : `Sprint ${indices.join(', ')} ended, export your hours`
  if (window.electronAPI) {
    window.electronAPI.notify.sprintExportDue(body)
  } else if ('Notification' in window) {
    void Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification('Timetracker', { body })
    })
  }
}

export const SPRINT_EXPORT_NOTIFY_KEY = 'sprint-export-notified'

export function shouldNotifyToday(today: string, indices: number[], stored: string | null): boolean {
  if (!stored) return true
  try {
    const raw: unknown = JSON.parse(stored)
    if (typeof raw !== 'object' || raw === null) return true
    if (!('date' in raw) || !('indices' in raw)) return true
    if (typeof raw.date !== 'string' || !Array.isArray(raw.indices)) return true
    if (raw.date !== today) return true
    const storedIndices: unknown[] = raw.indices
    const same = storedIndices.length === indices.length && indices.every((v, i) => storedIndices[i] === v)
    return !same
  } catch {
    return true
  }
}
