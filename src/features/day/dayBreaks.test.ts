import { describe, it, expect } from 'vitest'
import type { WorkPeriod } from '../../infra/repositories/types'
import { findBreaks } from './dayBreaks'

function period(start: string, end: string | null): WorkPeriod {
  return { id: `${start}-${end ?? 'open'}`, start, end, category: '_COREMEDIA', subtasks: [] }
}

describe('findBreaks', () => {
  it('reports the time between two consecutive WorkPeriods', () => {
    // Given two closed WorkPeriods with half an hour between them
    const windows = [period('09:00', '11:00'), period('11:30', '13:00')]

    // When
    const breaks = findBreaks(windows)

    // Then
    expect(breaks).toEqual([{ start: '11:00', end: '11:30', hours: 0.5 }])
  })

  it('reports no break when one WorkPeriod starts exactly when the previous one ended', () => {
    // Given back-to-back WorkPeriods
    const windows = [period('09:00', '11:00'), period('11:00', '13:00')]

    // When
    const breaks = findBreaks(windows)

    // Then
    expect(breaks).toEqual([])
  })

  it('measures the break from the latest end so far, not from the previous WorkPeriod', () => {
    // Given a short WorkPeriod nested inside a longer one, then a later WorkPeriod
    const windows = [period('09:00', '12:00'), period('10:00', '11:00'), period('12:30', '13:00')]

    // When
    const breaks = findBreaks(windows)

    // Then the break runs from 12:00 (the latest end) to 12:30
    expect(breaks).toEqual([{ start: '12:00', end: '12:30', hours: 0.5 }])
  })

  it('reports the break before an open WorkPeriod', () => {
    // Given a closed WorkPeriod followed by one that is still running
    const windows = [period('09:00', '11:00'), period('11:30', null)]

    // When
    const breaks = findBreaks(windows)

    // Then
    expect(breaks).toEqual([{ start: '11:00', end: '11:30', hours: 0.5 }])
  })

  it('reports no break after the last WorkPeriod, open or closed', () => {
    // Given a single running WorkPeriod
    // When
    // Then
    expect(findBreaks([period('09:00', null)])).toEqual([])
    expect(findBreaks([period('09:00', '11:00')])).toEqual([])
    expect(findBreaks([])).toEqual([])
  })
})
