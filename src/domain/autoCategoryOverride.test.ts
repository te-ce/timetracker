import { describe, it, expect } from 'vitest'
import { resolveAutoCategory } from './autoCategoryOverride'

describe('resolveAutoCategory', () => {
  it('returns global default when no per-day override exists', () => {
    const result = resolveAutoCategory({
      date: '2026-05-19',
      globalDefault: 'Coremedia',
      dayOverrides: new Map(),
    })
    expect(result).toBe('Coremedia')
  })

  it('returns per-day override when one exists for that date', () => {
    const result = resolveAutoCategory({
      date: '2026-05-19',
      globalDefault: 'Coremedia',
      dayOverrides: new Map([['2026-05-19', 'QA']]),
    })
    expect(result).toBe('QA')
  })

  it('returns null when global default is null and no override', () => {
    const result = resolveAutoCategory({
      date: '2026-05-19',
      globalDefault: null,
      dayOverrides: new Map(),
    })
    expect(result).toBeNull()
  })

  it('override takes precedence even when global is null', () => {
    const result = resolveAutoCategory({
      date: '2026-05-19',
      globalDefault: null,
      dayOverrides: new Map([['2026-05-19', 'Infra']]),
    })
    expect(result).toBe('Infra')
  })

  it('does not return override for different date', () => {
    const result = resolveAutoCategory({
      date: '2026-05-20',
      globalDefault: 'Coremedia',
      dayOverrides: new Map([['2026-05-19', 'QA']]),
    })
    expect(result).toBe('Coremedia')
  })
})
