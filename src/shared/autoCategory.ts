export type AutoCategoryResult = {
  hours: number
  isOverbooked: boolean
}

export function calculateAutoCategory(workedHours: number, manualTotal: number): AutoCategoryResult {
  const remaining = workedHours - manualTotal
  return {
    hours: Math.max(0, remaining),
    isOverbooked: remaining < 0,
  }
}

export function resolveAutoCategory(
  dayOverride: string | null | undefined,
  globalDefault: string | null,
): string | null {
  return dayOverride ?? globalDefault
}
