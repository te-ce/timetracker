/**
 * Worked − target for a single day, but only for days the running balance actually counts
 * (tracked hours, accumulatedOvertime known) — so the column always reconciles with the balance.
 */
export function dayDelta(workedHours: number, target: number, accumulatedOvertime: number | null): number | null {
  if (accumulatedOvertime === null || workedHours <= 0.001) return null
  return workedHours - target
}
