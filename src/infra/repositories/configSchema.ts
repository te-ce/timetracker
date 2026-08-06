import { z } from 'zod'
import type { Day, SprintExport } from './types'
import { DAY_TYPE_OVERRIDES, LEAVE_TYPES, STARTUP_VIEWS, WORK_LOCATIONS } from './types'
import type { HotkeyConfig } from '../../shared/hotkeyConfig'
import type { WeekdayHours } from '../../shared/weekdayHours'

const hotkeyConfigSchema: z.ZodType<HotkeyConfig> = z.object({
  globalToggle: z.string().nullable(),
  presentingMode: z.string().nullable(),
  inApp: z.record(z.string(), z.string().nullable()),
})

const weekdayHoursSchema: z.ZodType<WeekdayHours> = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
])

/**
 * The one field list for AppConfig: the type is inferred from it. A field
 * declared here is validated; a field that isn't declared here doesn't exist.
 */
const appConfigFields = z.object({
  weekdayHours: weekdayHoursSchema,
  autoCategory: z.string().nullable(),
  federalState: z.string().nullable(),
  sprintLengthDays: z.number(),
  sprintStartDate: z.string().nullable(),
  customCategories: z.array(z.string()),
  categoryOrder: z.array(z.string()).optional(),
  defaultWorkLocation: z.enum(WORK_LOCATIONS).nullish(),
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
  officeStats: z.boolean().optional(),
  showWorkedHoursInNav: z.boolean().optional(),
  showWorkedHoursInTray: z.boolean().optional(),
  showWorkedHoursInTrayBreakdown: z.boolean().optional(),
  remainingTimeReference: z.enum(['planned-stop', 'target-hours']).optional(),
  remainingTimeMode: z.enum(['until-zero-overtime', 'until-daily-target']).optional(),
  showTotalWorked: z.boolean().optional(),
  startupView: z.enum(STARTUP_VIEWS).optional(),
  archiveSprintSheet: z.boolean().optional(),
  sprintRoundingStep: z.number().optional(),
  sprintRoundingMode: z.enum(['nearest', 'up', 'down']).optional(),
})

export type AppConfig = z.infer<typeof appConfigFields>

export const appConfigSchema = appConfigFields
  .extend({
    // Legacy single daily target, superseded by weekdayHours. Kept so stored
    // configs written before the per-weekday model still resolve.
    sollstunden: z.number().optional(),
    weekdayHours: weekdayHoursSchema.optional(),
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
    location: z.enum(WORK_LOCATIONS).optional(),
    note: z.string().optional(),
    autoCategoryOverride: z.string().optional(),
    dayTypeOverride: z.enum(DAY_TYPE_OVERRIDES).optional(),
    halfDayLeave: z.enum(LEAVE_TYPES).optional(),
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
