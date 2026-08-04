import { parseLocalDate } from './dateUtils'

/** ISO-8601 week number of a local `YYYY-MM-DD` date. */
export function isoWeekOf(isoDate: string): number {
  const date = parseLocalDate(isoDate)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * ISO week-numbering year — not always the calendar year: 1 Jan 2027 falls in
 * week 53 of 2026, so grouping by week number alone would merge two years.
 */
export function isoWeekYearOf(isoDate: string): number {
  const date = parseLocalDate(isoDate)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}
