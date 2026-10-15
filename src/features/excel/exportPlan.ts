/**
 * Pure row-mapping logic shared by the Graph API and local-folder Excel adapters.
 * Each adapter reads its own rows (via fetch or ExcelJS) and feeds them here;
 * only the plan's execution (PATCH request vs cell write) differs per adapter.
 */

export function taskIdFromCell(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export interface TaskRow {
  taskId: string
  rowNumber: number
}

export interface PlannedWrite {
  rowNumber: number
  hours: number
}

/**
 * For each category in `mapping`, finds the row whose Task ID matches and pairs
 * it with that category's hours. Categories with no matching row, or rows with
 * no mapped category, are skipped.
 */
export function buildWritePlan(
  rows: TaskRow[],
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): PlannedWrite[] {
  const taskIdToRow = new Map(rows.map((r) => [r.taskId, r.rowNumber]))
  const plan: PlannedWrite[] = []
  for (const [category, taskId] of Object.entries(mapping)) {
    const rowNumber = taskIdToRow.get(taskId)
    if (rowNumber === undefined) continue
    plan.push({ rowNumber, hours: hoursPerCategory[category] ?? 0 })
  }
  return plan
}

/** Builds the [taskId, hours] rows written to a freshly created archive sheet. */
export function buildArchiveRows(
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): [string, number][] {
  return Object.entries(mapping).map(([category, taskId]) => [taskId, hoursPerCategory[category] ?? 0])
}
