// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { appConfigSchema, validateDay } from './configSchema'
import { DAY_TYPE_OVERRIDES } from './types'
import { DEFAULT_WEEKDAY_HOURS } from '../../shared/weekdayHours'

describe('appConfigSchema migration', () => {
  it('migrates old sollstunden-only config to weekdayHours', () => {
    const old = {
      sollstunden: 7,
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
    }
    const result = appConfigSchema.safeParse(old)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.weekdayHours).toEqual([0, 7, 7, 7, 7, 7, 0])
  })

  it('derives weekdayHours [0,8,8,8,8,8,0] when neither field present', () => {
    const minimal = {
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
    }
    const result = appConfigSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.weekdayHours).toEqual(DEFAULT_WEEKDAY_HOURS)
  })

  it('preserves existing weekdayHours when present', () => {
    const wh: [number, number, number, number, number, number, number] = [0, 6, 7, 7, 8, 5, 2]
    const cfg = {
      weekdayHours: wh,
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
    }
    const result = appConfigSchema.safeParse(cfg)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.weekdayHours).toEqual([0, 6, 7, 7, 8, 5, 2])
  })

  it('accepts trashRetentionDays as a number', () => {
    const cfg = {
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
      trashRetentionDays: 30,
    }
    const result = appConfigSchema.safeParse(cfg)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.trashRetentionDays).toBe(30)
  })

  it('accepts trashRetentionDays as null (keep forever)', () => {
    const cfg = {
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
      trashRetentionDays: null,
    }
    const result = appConfigSchema.safeParse(cfg)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.trashRetentionDays).toBeNull()
  })

  it('accepts preferCategoryDescriptionAsPrimary as a boolean', () => {
    const cfg = {
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
      preferCategoryDescriptionAsPrimary: true,
    }
    const result = appConfigSchema.safeParse(cfg)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.preferCategoryDescriptionAsPrimary).toBe(true)
  })

  it('leaves preferCategoryDescriptionAsPrimary undefined when absent', () => {
    const cfg = {
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
    }
    const result = appConfigSchema.safeParse(cfg)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.preferCategoryDescriptionAsPrimary).toBeUndefined()
  })

  it('fails when weekdayHours has wrong length', () => {
    const cfg = {
      weekdayHours: [0, 8, 8, 8, 8, 8],
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 14,
      sprintStartDate: null,
      customCategories: [],
    }
    const result = appConfigSchema.safeParse(cfg)
    expect(result.success).toBe(false)
  })
})

describe('validateDay dayTypeOverride', () => {
  it.each(DAY_TYPE_OVERRIDES)('keeps a day whose dayTypeOverride is %s', (override) => {
    const day = {
      windows: [{ id: 'w1', start: '09:00', end: '17:00', category: '_OTHER', subtasks: [] }],
      dayTypeOverride: override,
    }
    const result = validateDay(day)
    expect(result).not.toBeNull()
    expect(result?.dayTypeOverride).toBe(override)
    expect(result?.windows).toHaveLength(1)
  })

  it('drops a day whose dayTypeOverride is not a DayTypeOverride', () => {
    expect(validateDay({ windows: [], dayTypeOverride: 'Holiday' })).toBeNull()
  })
})
