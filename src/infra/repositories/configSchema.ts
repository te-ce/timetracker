import { z } from 'zod'
import type { Day, SprintExport } from './types'
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
    remainingTimeReference: z.enum(['planned-stop', 'target-hours']).optional(),
    remainingTimeMode: z.enum(['until-zero-overtime', 'until-daily-target']).optional(),
    archiveSprintSheet: z.boolean().optional(),
  })
  .passthrough()
  .transform((raw) => {
    const h = raw.sollstunden ?? 8
    const fallback: WeekdayHours = [0, h, h, h, h, h, 0]
    return { ...raw, weekdayHours: raw.weekdayHours ?? fallback }
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

const sprintExportSchema = z.object({
  sprintIndex: z.number(),
  status: z.enum(['pending', 'exported']),
  exportedAt: z.string().nullable(),
})

export function validateDay(v: unknown): Day | null {
  const r = daySchema.safeParse(v)
  if (!r.success) return null
  const data: Day = r.data
  return data
}

export function validateSprintExport(v: unknown): SprintExport | null {
  const r = sprintExportSchema.safeParse(v)
  if (!r.success) return null
  const data: SprintExport = r.data
  return data
}
