// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calculateOvertimeCarryOver } from './overtimeCarryOver'

describe('calculateOvertimeCarryOver', () => {
  it('returns initial value when no monthly history exists', () => {
    const result = calculateOvertimeCarryOver({
      initialOvertime: 10,
      monthlyOvertimes: [],
      manualOverrides: new Map(),
      targetMonth: '2026-05',
    })

    expect(result.value).toBe(10)
    expect(result.isManualOverride).toBe(false)
  })

  it('cumulates overtime from previous months', () => {
    const result = calculateOvertimeCarryOver({
      initialOvertime: 10,
      monthlyOvertimes: [
        { month: '2026-03', overtime: 3 },
        { month: '2026-04', overtime: -2 },
      ],
      manualOverrides: new Map(),
      targetMonth: '2026-05',
    })

    expect(result.value).toBe(11) // 10 + 3 + (-2)
    expect(result.isManualOverride).toBe(false)
  })

  it('uses manual override for target month', () => {
    const result = calculateOvertimeCarryOver({
      initialOvertime: 10,
      monthlyOvertimes: [
        { month: '2026-03', overtime: 3 },
        { month: '2026-04', overtime: -2 },
      ],
      manualOverrides: new Map([['2026-05', 5]]),
      targetMonth: '2026-05',
    })

    expect(result.value).toBe(5)
    expect(result.isManualOverride).toBe(true)
  })

  it('manual override mid-chain resets cumulation from that point', () => {
    const result = calculateOvertimeCarryOver({
      initialOvertime: 10,
      monthlyOvertimes: [
        { month: '2026-03', overtime: 3 },
        { month: '2026-04', overtime: 2 },
      ],
      manualOverrides: new Map([['2026-03', 0]]),
      targetMonth: '2026-05',
    })

    // Override at 2026-03 sets carry to 0, then +3 (overtime for 2026-03), then +2 (2026-04)
    expect(result.value).toBe(5) // 0 + 3 + 2
    expect(result.isManualOverride).toBe(false)
  })

  it('ignores months at or after target in monthlyOvertimes', () => {
    const result = calculateOvertimeCarryOver({
      initialOvertime: 10,
      monthlyOvertimes: [
        { month: '2026-04', overtime: 5 },
        { month: '2026-05', overtime: 99 },
        { month: '2026-06', overtime: 100 },
      ],
      manualOverrides: new Map(),
      targetMonth: '2026-05',
    })

    expect(result.value).toBe(15) // 10 + 5, ignoring 2026-05 and 2026-06
  })
})
