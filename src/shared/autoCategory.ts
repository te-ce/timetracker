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

/** The booked category with the most hours; ties go to whichever comes first in `categories`. */
export function pickCategoryWithMostHours(categoryHours: Record<string, number>, categories: string[]): string | null {
  return categories.reduce<string | null>((best, category) => {
    if (best === null) return category
    return (categoryHours[category] ?? 0) > (categoryHours[best] ?? 0) ? category : best
  }, null)
}
