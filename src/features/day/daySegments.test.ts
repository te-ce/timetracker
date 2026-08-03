import { describe, it, expect } from 'vitest'
import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { derivePeriodWarnings, deriveSegments } from './daySegments'

function period(start: string, end: string | null, subtasks: WorkPeriodSubtask[] = []): WorkPeriod {
  return { id: 'p1', start, end, category: '_COREMEDIA', subtasks }
}

describe('deriveSegments', () => {
  it('yields one main segment for a WorkPeriod without subtasks', () => {
    // Given a closed two-hour WorkPeriod
    const p = period('09:00', '11:00')

    // When
    const segments = deriveSegments(p, '12:00')

    // Then
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({
      kind: 'main',
      category: '_COREMEDIA',
      start: '09:00',
      end: '11:00',
      hours: 2,
      live: false,
    })
  })

  it('splits the main stretch around a timed subtask', () => {
    // Given a three-hour WorkPeriod interrupted by a half-hour subtask
    const p = period('10:00', '13:00', [
      { id: 's1', category: 'Review', hours: 0.5, startedAt: '11:00', stoppedAt: '11:30' },
    ])

    // When
    const segments = deriveSegments(p, '14:00')

    // Then the chain reads main → subtask → main, in clock order
    expect(segments).toMatchObject([
      { kind: 'main', category: '_COREMEDIA', start: '10:00', end: '11:00', hours: 1 },
      { kind: 'subtask', category: 'Review', start: '11:00', end: '11:30', hours: 0.5 },
      { kind: 'main', category: '_COREMEDIA', start: '11:30', end: '13:00', hours: 1.5 },
    ])
  })

  it('ends the chain with the live subtask and stops the main stretch where it began', () => {
    // Given an open WorkPeriod whose live subtask started at 13:50
    const p = period('13:30', null, [{ id: 's1', category: '_GUILDS', hours: 0, startedAt: '13:50' }])

    // When it is 14:20
    const segments = deriveSegments(p, '14:20')

    // Then the main stretch is paused at 13:50 and only the subtask is live
    expect(segments).toMatchObject([
      { kind: 'main', category: '_COREMEDIA', start: '13:30', end: '13:50', live: false },
      { kind: 'subtask', category: '_GUILDS', start: '13:50', end: null, hours: 0.5, live: true },
    ])
  })

  it('counts a planned stop only up to now while keeping the planned end visible', () => {
    // Given a WorkPeriod declared to run until 18:00 (a Planned-Stop WorkPeriod)
    const p = period('13:00', '18:00')

    // When it is 14:00
    const segments = deriveSegments(p, '14:00')

    // Then it has one hour so far, still shows 18:00, and counts as running
    expect(segments).toMatchObject([{ kind: 'main', start: '13:00', end: '18:00', hours: 1, live: true }])
  })

  it('does not treat a past day’s finished period as still running', () => {
    // Given a period that ended at 17:00 on a day that is over
    const p = period('09:00', '17:00')

    // When it is 14:00 on the wall clock but the viewed day is not today
    const segments = deriveSegments(p, '14:00', { isToday: false })

    // Then it is a plain closed stretch of eight hours
    expect(segments).toMatchObject([{ kind: 'main', start: '09:00', end: '17:00', hours: 8, live: false }])
  })

  it('carves a retro-logged subtask out of the main stretch and reports it without times', () => {
    // Given a three-hour WorkPeriod and half an hour logged afterwards from memory
    const p = period('10:00', '13:00', [{ id: 's1', category: '_MAINT', hours: 0.5, note: 'forgot to track' }])

    // When
    const segments = deriveSegments(p, '14:00')

    // Then the main stretch keeps its clock times but loses the logged half hour
    expect(segments).toMatchObject([
      { kind: 'main', start: '10:00', end: '13:00', hours: 2.5, placed: true },
      { kind: 'subtask', category: '_MAINT', start: null, end: null, hours: 0.5, placed: false },
    ])
  })
})

describe('derivePeriodWarnings', () => {
  it('reports nothing for a period whose subtasks fit', () => {
    // Given a one-hour period with a half-hour subtask
    const p = period('10:00', '11:00', [
      { id: 's1', category: 'Review', hours: 0.5, startedAt: '10:00', stoppedAt: '10:30' },
    ])

    // When
    const warnings = derivePeriodWarnings(p, '12:00')

    // Then
    expect(warnings).toEqual({ overlappingSubtaskIds: [], overbookedBy: 0 })
  })

  it('reports subtasks that overlap in time', () => {
    // Given two timed subtasks that share 10:30–10:45
    const p = period('10:00', '12:00', [
      { id: 's1', category: 'Review', hours: 0.75, startedAt: '10:00', stoppedAt: '10:45' },
      { id: 's2', category: 'Meeting', hours: 0.25, startedAt: '10:30', stoppedAt: '10:45' },
    ])

    // When
    const warnings = derivePeriodWarnings(p, '12:00')

    // Then both are flagged
    expect(warnings.overlappingSubtaskIds).toEqual(['s1', 's2'])
  })

  it('reports by how much closed subtasks exceed the period', () => {
    // Given 1.5h of subtasks inside a 1h period
    const p = period('10:00', '11:00', [
      { id: 's1', category: 'Review', hours: 0.75 },
      { id: 's2', category: 'Meeting', hours: 0.75 },
    ])

    // When
    const warnings = derivePeriodWarnings(p, '12:00')

    // Then
    expect(warnings.overbookedBy).toBeCloseTo(0.5, 5)
  })

  it('does not call a running period overbooked', () => {
    // Given an open period whose subtask already exceeds the elapsed time
    const p = period('10:00', null, [{ id: 's1', category: 'Review', hours: 2 }])

    // When it is 10:30
    const warnings = derivePeriodWarnings(p, '10:30')

    // Then no overbooking is reported — the period is still growing
    expect(warnings.overbookedBy).toBe(0)
  })
})
