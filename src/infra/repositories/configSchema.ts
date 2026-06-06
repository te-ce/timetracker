import { z } from 'zod'

const hotkeyConfigSchema = z.object({
  globalToggle: z.string().nullable(),
  inApp: z.record(z.string(), z.string().nullable()),
})

export const appConfigSchema = z
  .object({
    sollstunden: z.number(),
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
  })
  .passthrough()
