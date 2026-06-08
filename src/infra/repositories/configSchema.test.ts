// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { appConfigSchema } from './configSchema'
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
