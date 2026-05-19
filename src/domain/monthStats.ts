export interface MonthStats {
  totalHours: number
  targetHours: number
  overtime: number
  fulfillmentPercent: number
}

export function calculateMonthStats(
  workedHoursPerDay: number[],
  workDayCount: number,
  sollstunden: number,
): MonthStats {
  const totalHours = workedHoursPerDay.reduce((sum, h) => sum + h, 0)
  const targetHours = workDayCount * sollstunden
  const overtime = totalHours - targetHours
  const fulfillmentPercent = targetHours === 0 ? 100 : (totalHours / targetHours) * 100

  return { totalHours, targetHours, overtime, fulfillmentPercent }
}
