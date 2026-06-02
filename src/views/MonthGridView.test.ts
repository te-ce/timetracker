import { describe, it, expect } from 'vitest'
import { resolveGridConfig } from './gridConfig'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'
import type { AppConfig } from '../repositories/types'

describe('resolveGridConfig', () => {
  it('returns null autoCategory when config is undefined (not loaded yet)', () => {
    const result = resolveGridConfig(undefined)
    expect(result.autoCategory).toBeNull()
  })

  it('returns null sprintStartDate when config is undefined', () => {
    const result = resolveGridConfig(undefined)
    expect(result.sprintStartDate).toBeNull()
  })

  it('returns sensible defaults from DEFAULT_APP_CONFIG when config undefined', () => {
    const result = resolveGridConfig(undefined)
    expect(result.sprintLengthDays).toBe(DEFAULT_APP_CONFIG.sprintLengthDays)
    expect(result.customCategories).toEqual([])
    expect(result.defaultWorkLocation).toBeNull()
  })

  it('returns null autoCategory when config.autoCategory is null', () => {
    const config: AppConfig = { ...DEFAULT_APP_CONFIG, autoCategory: null }
    expect(resolveGridConfig(config).autoCategory).toBeNull()
  })

  it('returns null sprintStartDate when config.sprintStartDate is null', () => {
    const config: AppConfig = { ...DEFAULT_APP_CONFIG, sprintStartDate: null }
    expect(resolveGridConfig(config).sprintStartDate).toBeNull()
  })

  it('passes through configured values', () => {
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      autoCategory: '_SUPPORT',
      sprintStartDate: '2025-01-06',
      sprintLengthDays: 10,
      customCategories: ['A', 'B'],
    }
    const result = resolveGridConfig(config)
    expect(result.autoCategory).toBe('_SUPPORT')
    expect(result.sprintStartDate).toBe('2025-01-06')
    expect(result.sprintLengthDays).toBe(10)
    expect(result.customCategories).toEqual(['A', 'B'])
  })
})
