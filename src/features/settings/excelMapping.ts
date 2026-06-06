import type { ExcelRow } from '../excel'

export function matchScore(a: string, b: string): number {
  if (a.length < 3 || b.length < 3) return 0
  if (a.includes(b)) return b.length / a.length
  if (b.includes(a)) return a.length / b.length
  return 0
}

export function autoMatchCategories(
  categories: string[],
  rows: ExcelRow[],
  existingMapping: Record<string, string>,
): Record<string, string> {
  const result = { ...existingMapping }
  for (const category of categories) {
    if (result[category]) continue
    const catNorm = category.toLowerCase().replace(/[^a-z0-9]/g, '')
    let bestScore = 0
    let bestRow: ExcelRow | null = null
    for (const row of rows) {
      const desc = row.description.toLowerCase().replace(/[^a-z0-9]/g, '')
      const taskNorm = row.taskId.toLowerCase().replace(/[^a-z0-9]/g, '')
      const score = Math.max(matchScore(catNorm, desc), matchScore(catNorm, taskNorm))
      if (score > bestScore) {
        bestScore = score
        bestRow = row
      }
    }
    if (bestRow && bestScore >= 0.5) result[category] = bestRow.taskId
  }
  return result
}
