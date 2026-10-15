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

function roundForSheet(hours: number): number {
  return Math.round(hours * 100) / 100
}

/** Task IDs only; blank mapping values ('— not mapped —') count as unmapped. */
function sumHoursPerTask(
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): Map<string, number> {
  const perTask = new Map<string, number>()
  for (const [category, rawTaskId] of Object.entries(mapping)) {
    const taskId = rawTaskId.trim()
    if (taskId === '') continue
    perTask.set(taskId, (perTask.get(taskId) ?? 0) + (hoursPerCategory[category] ?? 0))
  }
  return perTask
}

export function hasMappedCategory(mapping: Record<string, string> | undefined): boolean {
  return Object.values(mapping ?? {}).some((taskId) => taskId.trim() !== '')
}

export interface UnmappedHours {
  category: string
  hours: number
}

/** Categories that have hours in the sprint but no Task ID, so their hours would not be exported. */
export function findUnmappedHours(
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): UnmappedHours[] {
  return Object.entries(hoursPerCategory)
    .filter(([category, hours]) => hours > 0 && (mapping[category] ?? '').trim() === '')
    .map(([category, hours]) => ({ category, hours }))
}

/**
 * For each Task ID in `mapping`, finds the matching row and pairs it with the
 * summed hours of all categories mapped to that Task ID. Task IDs with no
 * matching row, blank mappings, and rows with no mapped category are skipped.
 */
export function buildWritePlan(
  rows: TaskRow[],
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): PlannedWrite[] {
  const taskIdToRow = new Map(rows.map((r) => [r.taskId, r.rowNumber]))
  const plan: PlannedWrite[] = []
  for (const [taskId, hours] of sumHoursPerTask(mapping, hoursPerCategory)) {
    const rowNumber = taskIdToRow.get(taskId)
    if (rowNumber === undefined) continue
    plan.push({ rowNumber, hours: roundForSheet(hours) })
  }
  return plan
}

/** Builds the [taskId, hours] rows written to a freshly created archive sheet, one per Task ID. */
export function buildArchiveRows(
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): [string, number][] {
  return [...sumHoursPerTask(mapping, hoursPerCategory)].map(([taskId, hours]) => [taskId, roundForSheet(hours)])
}
