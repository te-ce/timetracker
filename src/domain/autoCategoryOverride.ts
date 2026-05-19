export interface ResolveAutoCategoryInput {
  date: string
  globalDefault: string | null
  dayOverrides: Map<string, string>
}

/**
 * Resolve which category receives auto-filled remaining hours for a given day.
 * Per-day override takes precedence over global default.
 */
export function resolveAutoCategory(input: ResolveAutoCategoryInput): string | null {
  const { date, globalDefault, dayOverrides } = input
  return dayOverrides.get(date) ?? globalDefault
}
