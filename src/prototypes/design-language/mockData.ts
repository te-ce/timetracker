// PROTOTYPE — throwaway mock data for design-language exploration. Do not import from real app code.
import type { Day, WorkPeriod } from '../../infra/repositories/types'

export interface CategoryDef {
  code: string
  label: string
  color: string // tailwind color name, e.g. "indigo"
}

const MAINT_CATEGORY: CategoryDef = { code: '_MAINT', label: 'Admin & Maintenance', color: 'gray' }

export const CATEGORIES: CategoryDef[] = [
  { code: '_COREMEDIA', label: 'CoreMedia CMS', color: 'indigo' },
  { code: '_SUPPORT', label: 'Support', color: 'amber' },
  { code: '_RELEASE', label: 'Release', color: 'emerald' },
  { code: '_GUILDS', label: 'Meetings & Guilds', color: 'sky' },
  MAINT_CATEGORY,
]

export function categoryFor(code: string): CategoryDef {
  return CATEGORIES.find((c) => c.code === code) ?? MAINT_CATEGORY
}

function period(id: string, start: string, end: string | null, category: string): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

// Two representative weeks of mock days, keyed by ISO date. "today" is the last work day and is left open (live tracking).
export const MOCK_MONTH: Record<string, Day> = {
  '2026-07-13': {
    windows: [
      period('p1', '2026-07-13T08:30', '2026-07-13T12:00', '_COREMEDIA'),
      period('p2', '2026-07-13T12:45', '2026-07-13T17:15', '_SUPPORT'),
    ],
    location: 'Office',
    confirmed: true,
  },
  '2026-07-14': {
    windows: [
      period('p1', '2026-07-14T09:00', '2026-07-14T13:00', '_COREMEDIA'),
      period('p2', '2026-07-14T13:30', '2026-07-14T16:45', '_COREMEDIA'),
    ],
    location: 'Remote',
    confirmed: true,
  },
  '2026-07-15': {
    windows: [
      period('p1', '2026-07-15T08:45', '2026-07-15T10:15', '_GUILDS'),
      period('p2', '2026-07-15T10:15', '2026-07-15T16:30', '_RELEASE'),
    ],
    location: 'Office',
    confirmed: true,
  },
  '2026-07-16': {
    windows: [
      period('p1', '2026-07-16T09:00', '2026-07-16T12:30', '_SUPPORT'),
      period('p2', '2026-07-16T13:00', '2026-07-16T17:30', '_SUPPORT'),
    ],
    location: 'Remote',
    confirmed: true,
  },
  '2026-07-17': {
    windows: [period('p1', '2026-07-17T09:00', '2026-07-17T15:30', '_MAINT')],
    location: 'Office',
    confirmed: true,
  },
  '2026-07-18': { windows: [], dayTypeOverride: 'Weekend' },
  '2026-07-19': { windows: [], dayTypeOverride: 'Weekend' },
  '2026-07-20': {
    windows: [
      period('p1', '2026-07-20T08:30', '2026-07-20T12:00', '_COREMEDIA'),
      period('p2', '2026-07-20T12:30', '2026-07-20T17:00', '_RELEASE'),
    ],
    location: 'Office',
    confirmed: true,
  },
  '2026-07-21': { windows: [], dayTypeOverride: 'Vacation' },
  '2026-07-22': {
    windows: [
      period('p1', '2026-07-22T09:15', '2026-07-22T13:00', '_COREMEDIA'),
      period('p2', '2026-07-22T13:45', '2026-07-22T18:00', '_COREMEDIA'),
    ],
    location: 'Remote',
    confirmed: true,
  },
  '2026-07-23': { windows: [], dayTypeOverride: 'SickDay' },
  '2026-07-24': {
    windows: [
      period('p1', '2026-07-24T08:30', '2026-07-24T12:15', '_SUPPORT'),
      period('p2', '2026-07-24T13:00', '2026-07-24T16:45', '_GUILDS'),
    ],
    location: 'Office',
    confirmed: true,
  },
  '2026-07-25': { windows: [], dayTypeOverride: 'Weekend' },
  '2026-07-26': { windows: [], dayTypeOverride: 'Weekend' },
  '2026-07-27': {
    windows: [
      period('p1', '2026-07-27T08:30', '2026-07-27T12:00', '_COREMEDIA'),
      period('p2', '2026-07-27T12:45', null, '_RELEASE'),
    ],
    location: 'Office',
    confirmed: false,
  },
}

export const TODAY_ISO = '2026-07-27'

export function hoursForPeriod(p: WorkPeriod, now = new Date('2026-07-27T15:40')): number {
  const start = new Date(p.start)
  const end = p.end ? new Date(p.end) : now
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
}

export function dayTotalHours(day: Day): number {
  return day.windows.reduce((sum, p) => sum + hoursForPeriod(p), 0)
}

export function categoryTotals(days: Record<string, Day>): { category: string; hours: number }[] {
  const totals = new Map<string, number>()
  for (const day of Object.values(days)) {
    for (const p of day.windows) {
      totals.set(p.category, (totals.get(p.category) ?? 0) + hoursForPeriod(p))
    }
  }
  return [...totals.entries()].map(([category, hours]) => ({ category, hours })).sort((a, b) => b.hours - a.hours)
}

export const SPRINT_TARGET_HOURS = 76 // 10 workdays * 7.6h
export const MOCK_SPRINT_HOURS = categoryTotals(MOCK_MONTH).reduce((s, c) => s + c.hours, 0)
