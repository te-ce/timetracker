import type { MonthTableRow } from '../table'
import { getSprintForDate } from './sprint'

export interface SprintGroup {
  label: string
  rows: MonthTableRow[]
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
    const sprintIdx = getSprintForDate(row.date, config).index

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
