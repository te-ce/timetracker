import { describe, it, expect } from 'vitest'
import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { buildDayStream, deriveDayStats, findActiveTracking } from './dayStreamModel'

function period(
  start: string,
  end: string | null,
  subtasks: WorkPeriodSubtask[] = [],
  category = '_COREMEDIA',
): WorkPeriod {
  return { id: `${start}-${end ?? 'open'}`, start, end, category, subtasks }
}

describe('deriveDayStats', () => {
  it('summarises worked time, breaks and time at the desk', () => {
    // Given two WorkPeriods with a half-hour break between them
    const windows = [period('08:00', '09:30'), period('10:00', '13:00')]

    // When
    const stats = deriveDayStats(windows, '14:00')

    // Then
    expect(stats).toMatchObject({
      worked: 4.5,
      breakHours: 0.5,
      breakCount: 1,
      atDesk: 5,
      firstStart: '08:00',
      lastStop: '13:00',
      runningSince: undefined,
    })
  })

  it('counts the stretch before an open WorkPeriod as a break and reports what is running', () => {
    // Given work in the morning and an open WorkPeriod since 13:30
    const windows = [period('08:00', '09:30'), period('13:30', null)]

    // When it is 14:00
    const stats = deriveDayStats(windows, '14:00')

    // Then
    expect(stats).toMatchObject({
      worked: 2,
      breakHours: 4,
      breakCount: 1,
      atDesk: 6,
      firstStart: '08:00',
      lastStop: undefined,
      runningSince: '13:30',
    })
  })

  it('attributes the time of a running subtask to that subtask category, largest first', () => {
    // Given an open WorkPeriod on _COREMEDIA whose live _GUILDS subtask started at 13:50
    const windows = [period('13:30', null, [{ id: 's1', category: '_GUILDS', hours: 0, startedAt: '13:50' }])]

    // When it is 14:20
    const totals = deriveDayStats(windows, '14:20').categoryTotals

    // Then the half hour counts as _GUILDS, not as the period's own category
    expect(totals.map((t) => t.category)).toEqual(['_GUILDS', '_COREMEDIA'])
    expect(totals[0]?.hours).toBeCloseTo(0.5, 5)
    expect(totals[1]?.hours).toBeCloseTo(1 / 3, 5)
  })
})

describe('findActiveTracking', () => {
  it('reports the live subtask rather than the WorkPeriod category', () => {
    // Given an open WorkPeriod whose live subtask started later
    const windows = [period('13:30', null, [{ id: 's1', category: '_GUILDS', hours: 0, startedAt: '13:50' }])]

    // When
    const active = findActiveTracking(windows, '14:20')

    // Then
    expect(active).toMatchObject({ category: '_GUILDS', since: '13:50', elapsed: 0.5 })
  })

  it('does not count a Planned-Stop WorkPeriod as running', () => {
    // Given a WorkPeriod declared to stop at 18:00
    const windows = [period('13:00', '18:00')]

    // When it is 14:00, before that declared stop
    const active = findActiveTracking(windows, '14:00')

    // Then nothing is being tracked — the declared stop already closed it
    expect(active).toBeUndefined()
  })

  it('treats the latest open WorkPeriod as the current session', () => {
    // Given two open WorkPeriods, which should not happen but is recoverable
    const windows = [period('09:00', null), period('13:00', null)]

    // When
    const active = findActiveTracking(windows, '14:00')

    // Then the later one is the session being tracked
    expect(active?.since).toBe('13:00')
  })

  it('reports nothing when every WorkPeriod is closed', () => {
    expect(findActiveTracking([period('08:00', '09:30')], '10:00')).toBeUndefined()
  })
})

describe('buildDayStream', () => {
  it('interleaves WorkPeriod boundaries, their segments and the breaks between them in clock order', () => {
    // Given a morning WorkPeriod, a break, then a WorkPeriod with a subtask
    const windows = [
      period('08:00', '09:30'),
      period('10:00', '13:00', [{ id: 's1', category: 'Review', hours: 0.5, startedAt: '11:00', stoppedAt: '11:30' }]),
    ]

    // When
    const items = buildDayStream(windows, '14:00')

    // Then
    expect(items).toMatchObject([
      { type: 'period', ordinal: 1, period: { start: '08:00' } },
      { type: 'segment', segment: { kind: 'main', start: '08:00', end: '09:30' } },
      { type: 'break', break: { start: '09:30', end: '10:00' } },
      { type: 'period', ordinal: 2, period: { start: '10:00' } },
      { type: 'segment', segment: { kind: 'main', start: '10:00', end: '11:00' } },
      { type: 'segment', segment: { kind: 'subtask', category: 'Review' } },
      { type: 'segment', segment: { kind: 'main', start: '11:30', end: '13:00' } },
    ])
  })

  it('marks the last segment of a WorkPeriod so the stream can hang per-period actions off it', () => {
    // Given one WorkPeriod with a subtask at the end
    const windows = [period('10:00', '13:00', [{ id: 's1', category: '_MAINT', hours: 0.5 }])]

    // When
    const items = buildDayStream(windows, '14:00')
    const segments = items.filter((item) => item.type === 'segment')

    // Then
    expect(segments.map((item) => item.last)).toEqual([false, true])
  })
})
