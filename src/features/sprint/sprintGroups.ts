import type { MonthTableRow } from '../table'
import { getSprintForDate } from './sprint'

export interface SprintGroup {
  label: string
  rows: MonthTableRow[]
}

function sprintGroupLabel(index: number): string {
  return index < 0 ? 'Before sprint 1' : `Sprint ${index + 1}`
}

export function computeSprintGroups(
  rows: MonthTableRow[],
  sprintStartDate: string | null,
  sprintLengthDays: number,
): SprintGroup[] {
  if (!sprintStartDate || sprintLengthDays <= 0) {
    return [{ label: '', rows }]
  }

  const config = { startDate: sprintStartDate, lengthDays: sprintLengthDays }
  const groups: SprintGroup[] = []
  let currentRows: MonthTableRow[] = []
  let currentSprintIdx: number | null = null

  for (const row of rows) {
    const sprintIdx = Math.max(getSprintForDate(row.date, config).index, -1)

    if (currentSprintIdx === null || sprintIdx !== currentSprintIdx) {
      if (currentRows.length > 0) {
        groups.push({ label: sprintGroupLabel(currentSprintIdx ?? 0), rows: currentRows })
      }
      currentRows = [row]
      currentSprintIdx = sprintIdx
    } else {
      currentRows.push(row)
    }
  }

  if (currentRows.length > 0) {
    groups.push({ label: sprintGroupLabel(currentSprintIdx ?? 0), rows: currentRows })
  }

  return groups
}
