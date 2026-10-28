import type { Day, WorkPeriod } from '../../infra/repositories/types'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Undo one action without discarding anything that happened since: only the
// periods and day fields the action changed (before → after) go back to their
// `before` state; everything else keeps its `current` value.
export function revertDayChange(current: Day, before: Day, after: Day): Day {
  const byId = (windows: WorkPeriod[]) => new Map(windows.map((w) => [w.id, w]))
  const beforeById = byId(before.windows)
  const afterById = byId(after.windows)
  const touched = new Set(
    [...beforeById.keys(), ...afterById.keys()].filter((id) => !same(beforeById.get(id), afterById.get(id))),
  )

  const windows: WorkPeriod[] = []
  for (const w of current.windows) {
    if (!touched.has(w.id)) windows.push(w)
  }
  for (const id of touched) {
    const restored = beforeById.get(id)
    if (restored) windows.push(restored)
  }
  windows.sort((a, b) => a.start.localeCompare(b.start))

  const result: Day = { ...current, windows }
  for (const field of DAY_FIELDS) revertField(result, field, before, after)
  return result
}

const DAY_FIELDS = ['location', 'note', 'autoCategoryOverride', 'dayTypeOverride', 'halfDayLeave'] as const

function revertField<K extends (typeof DAY_FIELDS)[number]>(out: Day, field: K, before: Day, after: Day): void {
  if (!same(before[field], after[field])) out[field] = before[field]
}
