import type { MonthGridRow } from './monthGrid'

export interface SprintGroup {
  label: string
  rows: MonthGridRow[]
}

export function computeSprintGroups(
  rows: MonthGridRow[],
  sprintStartDate: string | null,
  sprintLengthDays: number,
): SprintGroup[] {
  if (!sprintStartDate || sprintLengthDays <= 0) {
    return [{ label: '', rows }]
  }

  const sprintStart = new Date(sprintStartDate)
  const groups: SprintGroup[] = []
  let currentRows: MonthGridRow[] = []
  let currentSprintIdx: number | null = null

  for (const row of rows) {
    const rowDate = new Date(row.date)
    const diffMs = rowDate.getTime() - sprintStart.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const sprintIdx = Math.floor(diffDays / sprintLengthDays)

    if (currentSprintIdx === null || sprintIdx !== currentSprintIdx) {
      if (currentRows.length > 0) {
        groups.push({ label: `Sprint ${currentSprintIdx! + 1}`, rows: currentRows })
      }
      currentRows = [row]
      currentSprintIdx = sprintIdx
    } else {
      currentRows.push(row)
    }
  }

  if (currentRows.length > 0) {
    groups.push({ label: `Sprint ${currentSprintIdx! + 1}`, rows: currentRows })
  }

  return groups
}
