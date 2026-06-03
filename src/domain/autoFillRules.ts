import type { DatedTimeEntry } from '../repositories/types'
import type { DayType } from './dayType'
import { parseLocalDate, toLocalIso } from './dateUtils'

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
  const d = parseLocalDate(iso)
  d.setDate(d.getDate() + days)
  return toLocalIso(d)
}

function isWorkDay(date: string, dayTypes: Map<string, DayType>): boolean {
  const explicit = dayTypes.get(date)
  if (explicit) return explicit === 'WorkDay'
  const dow = parseLocalDate(date).getDay()
  return dow !== 0 && dow !== 6
}

function matchesPattern(date: string, pattern: AutoFillPattern): boolean {
  if (pattern.type === 'everyWorkday') return true

  const dow = parseLocalDate(date).getDay()
  if (!pattern.days.includes(dow)) return false

  // Use UTC date-counting for week diff to avoid DST skew
  const ap = pattern.anchorDate.split('-')
  const cp = date.split('-')
  const anchorDays = Math.floor(Date.UTC(Number(ap[0]), Number(ap[1]) - 1, Number(ap[2])) / MS_PER_DAY)
  const currentDays = Math.floor(Date.UTC(Number(cp[0]), Number(cp[1]) - 1, Number(cp[2])) / MS_PER_DAY)
  const weeksDiff = Math.floor((currentDays - anchorDays) / 7)
  return weeksDiff % pattern.intervalWeeks === 0
}

let counter = 0

export function materializeAutoFillRules(input: MaterializeInput): DatedTimeEntry[] {
  const { rules, fromDate, toDate, dayTypes } = input
  const entries: DatedTimeEntry[] = []

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
