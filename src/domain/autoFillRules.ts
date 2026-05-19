import type { TimeEntry } from '../repositories/types'
import type { DayType } from './dayType'

export type AutoFillPattern =
  | { type: 'everyWorkday' }
  | { type: 'weekly'; days: number[]; intervalWeeks: number; anchorDate: string }

export interface AutoFillRule {
  id: string
  category: string
  hours: number
  pattern: AutoFillPattern
  label?: string
  materializedDates: Set<string>
}

export interface MaterializeInput {
  rules: AutoFillRule[]
  fromDate: string
  toDate: string
  dayTypes: Map<string, DayType>
}

const MS_PER_DAY = 86_400_000

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function isWorkDay(date: string, dayTypes: Map<string, DayType>): boolean {
  const explicit = dayTypes.get(date)
  if (explicit) return explicit === 'WorkDay'
  const dow = new Date(date).getUTCDay()
  return dow !== 0 && dow !== 6
}

function matchesPattern(date: string, pattern: AutoFillPattern): boolean {
  if (pattern.type === 'everyWorkday') return true

  const dow = new Date(date).getUTCDay()
  if (!pattern.days.includes(dow)) return false

  const anchor = new Date(pattern.anchorDate).getTime()
  const current = new Date(date).getTime()
  const weeksDiff = Math.floor((current - anchor) / (7 * MS_PER_DAY))
  return weeksDiff % pattern.intervalWeeks === 0
}

let counter = 0

export function materializeAutoFillRules(input: MaterializeInput): TimeEntry[] {
  const { rules, fromDate, toDate, dayTypes } = input
  const entries: TimeEntry[] = []

  for (const rule of rules) {
    let current = fromDate
    while (current <= toDate) {
      if (
        isWorkDay(current, dayTypes) &&
        !rule.materializedDates.has(current) &&
        matchesPattern(current, rule.pattern)
      ) {
        entries.push({
          id: `autofill-${rule.id}-${current}-${counter++}`,
          date: current,
          category: rule.category,
          hours: rule.hours,
        })
      }
      current = addDays(current, 1)
    }
  }

  return entries
}
