import { z } from 'zod'
import type { Day, ActiveTracking, SprintExport } from './types'
import type { WeekdayHours } from '../../shared/weekdayHours'

const hotkeyConfigSchema = z.object({
  globalToggle: z.string().nullable(),
  inApp: z.record(z.string(), z.string().nullable()),
})

const weekdayHoursSchema = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])

export const appConfigSchema = z
  .object({
    sollstunden: z.number().optional(),
    weekdayHours: weekdayHoursSchema.optional(),
    autoCategory: z.string().nullable(),
    federalState: z.string().nullable(),
    sprintLengthDays: z.number(),
    sprintStartDate: z.string().nullable(),
    customCategories: z.array(z.string()),
    categoryOrder: z.array(z.string()).optional(),
    defaultWorkLocation: z.enum(['Office', 'Remote']).nullish(),
    sharepointUrl: z.string().nullish(),
    targetSheet: z.string().nullish(),
    categoryMapping: z.record(z.string(), z.string()).optional(),
    categoryDescriptions: z.record(z.string(), z.string()).optional(),
    categoryImportOrder: z.array(z.string()).optional(),
    localExcelFile: z.string().nullish(),
    launchAtLogin: z.boolean().optional(),
    startMinimized: z.boolean().optional(),
    closeToTray: z.boolean().optional(),
    hotkeys: hotkeyConfigSchema.optional(),
    showOvertimeBar: z.boolean().optional(),
    officeStats: z.boolean().optional(),
    showWorkedHoursInNav: z.boolean().optional(),
    showWorkedHoursInTray: z.boolean().optional(),
    showWorkedHoursInTaskMenu: z.boolean().optional(),
    remainingTimeReference: z.enum(['planned-stop', 'target-hours']).optional(),
    remainingTimeMode: z.enum(['until-zero-overtime', 'until-daily-target']).optional(),
  })
  .passthrough()
  .transform((raw) => {
    if (!raw.weekdayHours) {
      const h = raw.sollstunden ?? 8
      const migrated: WeekdayHours = [0, h, h, h, h, h, 0]
      return { ...raw, weekdayHours: migrated }
    }
    return raw
  })

const workPeriodSubtaskSchema = z.object({
  id: z.string(),
  category: z.string(),
  hours: z.number(),
  startedAt: z.string().optional(),
  stoppedAt: z.string().optional(),
  note: z.string().optional(),
})

const workPeriodSchema = z.object({
  id: z.string(),
  start: z.string(),
  end: z.string().nullable(),
  category: z.string(),
  subtasks: z.array(workPeriodSubtaskSchema),
})

export const daySchema = z
  .object({
    windows: z.array(workPeriodSchema),
    location: z.enum(['Office', 'Remote']).optional(),
    confirmed: z.boolean().optional(),
    note: z.string().optional(),
    autoCategoryOverride: z.string().optional(),
    dayTypeOverride: z.enum(['PublicHoliday', 'Vacation', 'SickDay']).optional(),
  })
  .passthrough()

const activeTrackingSchema = z.object({
  category: z.string(),
  date: z.string(),
  startedAt: z.string(),
})

const sprintExportSchema = z.object({
  sprintIndex: z.number(),
  status: z.enum(['pending', 'exported']),
  exportedAt: z.string().nullable(),
})

// Validator functions bridge Zod's inferred types to the explicit domain types.
// The unknown intermediate satisfies no-unsafe-return; Zod guarantees structural validity.
export function validateDay(v: unknown): Day | null {
  const r = daySchema.safeParse(v)
  if (!r.success) return null
  const data: unknown = r.data
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return data as Day
}

export function validateActiveTracking(v: unknown): ActiveTracking | null {
  const r = activeTrackingSchema.safeParse(v)
  if (!r.success) return null
  const data: unknown = r.data
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return data as ActiveTracking
}

export function validateSprintExport(v: unknown): SprintExport | null {
  const r = sprintExportSchema.safeParse(v)
  if (!r.success) return null
  const data: unknown = r.data
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return data as SprintExport
}
