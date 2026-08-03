import { describe, it, expect } from 'vitest'
import { balanceInk, formatSignedHours } from './monthBalanceFormat'

describe('formatSignedHours', () => {
  it('marks overtime with a plus and undertime with a minus sign', () => {
    expect(formatSignedHours(1.5, 'decimal')).toBe('+1.50h')
    expect(formatSignedHours(-1.5, 'decimal')).toBe('−1.50h')
    expect(formatSignedHours(0.75, 'hhmm')).toBe('+0:45')
    expect(formatSignedHours(-0.75, 'hhmm')).toBe('−0:45')
  })

  it('renders a balanced day without a sign', () => {
    expect(formatSignedHours(0, 'decimal')).toBe('0.00h')
    // Sub-second rounding noise is still "balanced", not "+0.00h".
    expect(formatSignedHours(0.001, 'decimal')).toBe('0.00h')
  })
})

describe('balanceInk', () => {
  it('separates overtime, undertime and balanced', () => {
    expect(balanceInk(2)).toContain('emerald')
    expect(balanceInk(-2)).toContain('amber')
    expect(balanceInk(0)).toContain('gray')
  })
})
