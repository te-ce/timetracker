export interface MonthStats {
  totalHours: number
  targetHours: number
  overtime: number
  fulfillmentPercent: number
}

export interface OvertimeToDate {
  /** Cumulative overtime/undertime for all tracked days up to and including today */
  value: number
  /** Hours worked on the "today" date */
  workedToday: number
  /** Overtime/undertime from days strictly before today */
  priorOvertime: number
}

export function calculateMonthStats(workedHoursPerDay: number[], targetHoursPerDay: number[]): MonthStats {
  const totalHours = workedHoursPerDay.reduce((sum, h) => sum + h, 0)
  // Only count target for days with tracked hours
  const targetHours = workedHoursPerDay.reduce((sum, h, i) => (h > 0 ? sum + (targetHoursPerDay[i] ?? 0) : sum), 0)
  const overtime = totalHours - targetHours
  const fulfillmentPercent = targetHours === 0 ? 100 : (totalHours / targetHours) * 100

  return { totalHours, targetHours, overtime, fulfillmentPercent }
}

/**
 * Running cumulative over/undertime as of each date in `dates`, considering
 * only days with tracked hours. Dates after `today` are `null` (not yet
 * knowable). Days with zero worked hours carry the previous cumulative value
 * forward unchanged.
 *
 * `projectedWorkedToday`, when given, replaces today's hours in the cumulative
 * total so a planned-stop period's still-to-come portion counts toward the
 * running over/undertime.
 *
 * Single running accumulator instead of recomputing the cumulative total from
 * day 1 for every entry (that would be O(n²) over a month).
 */
export function calculateCumulativeOvertime(
  workedHoursPerDay: number[],
  dates: string[],
  targetHoursPerDay: number[],
  today: string,
  projectedWorkedToday?: number,
): (number | null)[] {
  let cumWorked = 0
  let cumTarget = 0
  return dates.map((date, i) => {
    if (date > today) return null

    const target = targetHoursPerDay[i] ?? 0
    const hours = workedHoursPerDay[i] ?? 0
    const effectiveHours = date === today ? (projectedWorkedToday ?? hours) : hours

    if (effectiveHours > 0) {
      cumWorked += effectiveHours
      cumTarget += target
    }

    return cumWorked - cumTarget
  })
}

/**
 * Calculate over/undertime considering only days with tracked hours,
 * up to and including today. Also computes how much work is still needed today.
 *
 * `workedToday` stays actual/elapsed even when `projectedWorkedToday` is given —
 * callers showing "today so far" (e.g. the overtime bar) should not jump ahead.
 */
export function calculateOvertimeToDate(
  workedHoursPerDay: number[],
  dates: string[],
  today: string,
  targetHoursPerDay: number[],
  projectedWorkedToday?: number,
): OvertimeToDate {
  const cumulative = calculateCumulativeOvertime(
    workedHoursPerDay,
    dates,
    targetHoursPerDay,
    today,
    projectedWorkedToday,
  )

  const todayIndex = dates.indexOf(today)
  const workedToday = todayIndex >= 0 ? (workedHoursPerDay[todayIndex] ?? 0) : 0

  let value = 0
  let priorOvertime = 0
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    if (date === undefined || date > today) break
    const c = cumulative[i]
    if (typeof c !== 'number') continue
    value = c
    if (date < today) priorOvertime = c
  }

  return { value, workedToday, priorOvertime }
}
