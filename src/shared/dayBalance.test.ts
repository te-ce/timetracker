// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { deriveDayBalance, hasLiveActivity, type DayBalanceInput } from './dayBalance'
import type { WorkPeriod } from '../infra/repositories/types'

function period(start: string, end: string | null): WorkPeriod {
  return { id: `${start}-${end ?? 'open'}`, start, end, category: '_OTHER', subtasks: [] }
}

function derive(overrides: Partial<DayBalanceInput> = {}) {
  return deriveDayBalance({
    windows: [],
    sollstunden: 8,
    priorOvertime: 0,
    now: '12:00',
    remainingTimeReference: 'target-hours',
    remainingTimeMode: 'until-zero-overtime',
    ...overrides,
  })
}

describe('deriveDayBalance worked split', () => {
  it('counts a closed period as closed work', () => {
    const b = derive({ windows: [period('09:00', '11:00')] })
    expect(b.closedWorked).toBeCloseTo(2)
    expect(b.liveElapsed).toBe(0)
    expect(b.worked).toBeCloseTo(2)
  })

  it('counts an open period as live, not closed', () => {
    const b = derive({ windows: [period('09:00', null)] })
    expect(b.closedWorked).toBe(0)
    expect(b.liveElapsed).toBeCloseTo(3)
    expect(b.worked).toBeCloseTo(3)
  })

  it('counts a planned-stop period as live until its end passes', () => {
    const b = derive({ windows: [period('09:00', '17:00')] })
    expect(b.liveElapsed).toBeCloseTo(3)
    expect(b.closedWorked).toBe(0)
  })

  it('counts a planned-stop period as closed once its end has passed', () => {
    const b = derive({ windows: [period('09:00', '11:00')], now: '12:00' })
    expect(b.closedWorked).toBeCloseTo(2)
    expect(b.liveElapsed).toBe(0)
  })

  it('sums closed and live across several periods', () => {
    const b = derive({ windows: [period('08:00', '10:00'), period('11:00', null)] })
    expect(b.closedWorked).toBeCloseTo(2)
    expect(b.liveElapsed).toBeCloseTo(1)
    expect(b.worked).toBeCloseTo(3)
  })

  it('tolerates a tick landing just before a period start', () => {
    const b = derive({ windows: [period('12:03', null)], now: '12:00' })
    expect(b.liveElapsed).toBe(0)
  })
})

describe('deriveDayBalance projection', () => {
  it('projects the full planned duration when a planned stop exists', () => {
    const b = derive({ windows: [period('09:00', '15:00')] })
    expect(b.worked).toBeCloseTo(3)
    expect(b.projectedWorked).toBeCloseTo(6)
    expect(b.hasPlannedStop).toBe(true)
  })

  it('projects the elapsed hours when no planned stop exists', () => {
    const b = derive({ windows: [period('09:00', null)] })
    expect(b.projectedWorked).toBeCloseTo(b.worked)
    expect(b.hasPlannedStop).toBe(false)
  })

  it('remaining uses projected hours, not elapsed hours', () => {
    const b = derive({ windows: [period('09:00', '15:00')] })
    expect(b.remaining).toBeCloseTo(2)
  })

  it('projectedRemaining subtracts carry-over and projected hours from the target', () => {
    const b = derive({ windows: [period('09:00', '15:00')], priorOvertime: 1 })
    expect(b.projectedRemaining).toBeCloseTo(1)
  })
})

describe('deriveDayBalance remaining', () => {
  it('subtracts carry-over in until-zero-overtime mode', () => {
    const b = derive({ windows: [period('09:00', '12:00')], priorOvertime: 2 })
    expect(b.requiredToday).toBeCloseTo(6)
    expect(b.remaining).toBeCloseTo(3)
  })

  it('ignores carry-over in until-daily-target mode', () => {
    const b = derive({
      windows: [period('09:00', '12:00')],
      priorOvertime: 2,
      remainingTimeMode: 'until-daily-target',
    })
    expect(b.requiredToday).toBeCloseTo(8)
    expect(b.remaining).toBeCloseTo(5)
  })

  it('counts down to the planned stop when the reference is planned-stop', () => {
    const b = derive({ windows: [period('09:00', '17:00')], remainingTimeReference: 'planned-stop' })
    expect(b.isPlannedStopMode).toBe(true)
    expect(b.countdownHours).toBeCloseTo(5)
    expect(b.remaining).toBeCloseTo(5)
  })

  it('ignores the planned stop for the countdown when the reference is target-hours', () => {
    const b = derive({ windows: [period('09:00', '17:00')], remainingTimeReference: 'target-hours' })
    expect(b.isPlannedStopMode).toBe(false)
    expect(b.plannedStopTime).toBe('17:00')
    expect(b.remaining).toBeCloseTo(0)
  })
})

describe('hasLiveActivity', () => {
  it('is true for an open period', () => {
    expect(hasLiveActivity([period('09:00', null)], '12:00')).toBe(true)
  })

  it('is true for a planned-stop period', () => {
    expect(hasLiveActivity([period('09:00', '17:00')], '12:00')).toBe(true)
  })

  it('is false when every period has ended', () => {
    expect(hasLiveActivity([period('09:00', '11:00')], '12:00')).toBe(false)
  })

  it('is false for a day with no periods', () => {
    expect(hasLiveActivity([], '12:00')).toBe(false)
  })
})
