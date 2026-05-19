import type { Sprint } from './sprint'

export type ExportStatus = 'pending' | 'exported'

export interface SprintExport {
  sprintIndex: number
  status: ExportStatus
  exportedAt: string | null
}

const MS_PER_DAY = 86_400_000

export function shouldAutoExport(
  sprint: Sprint,
  sprintExport: SprintExport,
  autoExportDelayDays: number,
  today: string,
): boolean {
  if (sprintExport.status === 'exported') return false

  const sprintEnd = new Date(sprint.end).getTime()
  const now = new Date(today).getTime()

  if (now <= sprintEnd) return false

  const daysSinceEnd = (now - sprintEnd) / MS_PER_DAY
  return daysSinceEnd > autoExportDelayDays
}
