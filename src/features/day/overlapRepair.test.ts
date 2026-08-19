import { describe, it, expect } from 'vitest'
import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { applyOverlapFix, findSubtaskOverlaps, suggestOverlapFixes } from './overlapRepair'

function period(subtasks: WorkPeriodSubtask[]): WorkPeriod {
  return { id: 'p', start: '09:00', end: '17:00', category: 'Work', subtasks }
}

const review: WorkPeriodSubtask = { id: 's1', category: 'Review', hours: 1.5, startedAt: '10:00', stoppedAt: '11:30' }
const meeting: WorkPeriodSubtask = {
  id: 's2',
  category: 'Meeting',
  hours: 1.25,
  startedAt: '11:00',
  stoppedAt: '12:15',
}

describe('findSubtaskOverlaps', () => {
  it('finds nothing when the subtasks only touch', () => {
    // Given one subtask starting exactly when the other stops
    const p = period([review, { ...meeting, startedAt: '11:30', stoppedAt: '12:15' }])

    // When / Then
    expect(findSubtaskOverlaps(p)).toEqual([])
  })

  it('pairs up the shared minutes, earlier subtask first', () => {
    // Given Review 10:00–11:30 and Meeting 11:00–12:15
    const p = period([meeting, review])

    // When
    const [overlap, ...rest] = findSubtaskOverlaps(p)

    // Then the 30 shared minutes are reported against the earlier starter
    expect(rest).toEqual([])
    expect(overlap?.earlier.id).toBe('s1')
    expect(overlap?.later.id).toBe('s2')
    expect(overlap?.hours).toBe(0.5)
  })

  it('ignores subtasks logged without times', () => {
    // Given a duration-only subtask alongside a timed one
    const p = period([review, { id: 's3', category: 'Guild', hours: 1 }])

    // When / Then it cannot sit on the clock, so it cannot clash
    expect(findSubtaskOverlaps(p)).toEqual([])
  })

  it('reports every clashing pair in a chain', () => {
    // Given three subtasks where each overlaps its successor
    const p = period([
      review,
      meeting,
      { id: 's3', category: 'Maint', hours: 1, startedAt: '12:00', stoppedAt: '13:00' },
    ])

    // When
    const overlaps = findSubtaskOverlaps(p)

    // Then both pairs are found, but not the non-overlapping first/third
    expect(overlaps.map((o) => [o.earlier.id, o.later.id])).toEqual([
      ['s1', 's2'],
      ['s2', 's3'],
    ])
  })
})

describe('suggestOverlapFixes', () => {
  it('offers trim, delay and split for a partial overlap', () => {
    // Given Review 10:00–11:30 overlapping Meeting 11:00–12:15
    const [overlap] = findSubtaskOverlaps(period([review, meeting]))

    // When
    const fixes = overlap ? suggestOverlapFixes(overlap) : []

    // Then each option names the time it would write, splitting at the middle of the clash
    expect(fixes).toEqual([
      { kind: 'trim-earlier', earlierId: 's1', laterId: 's2', at: '11:00' },
      { kind: 'delay-later', earlierId: 's1', laterId: 's2', at: '11:30' },
      { kind: 'split', earlierId: 's1', laterId: 's2', at: '11:15' },
    ])
  })

  it('offers only delay when both subtasks start at the same time', () => {
    // Given two subtasks starting at 10:00, so there is no boundary to trim back to
    const [overlap] = findSubtaskOverlaps(period([review, { ...meeting, startedAt: '10:00' }]))

    // When
    const fixes = overlap ? suggestOverlapFixes(overlap) : []

    // Then
    expect(fixes).toEqual([{ kind: 'delay-later', earlierId: 's1', laterId: 's2', at: '11:30' }])
  })

  it('skips the split when the clash is shorter than the snap grid', () => {
    // Given a four-minute overlap, where a 5-minute split would land on a boundary
    const [overlap] = findSubtaskOverlaps(period([review, { ...meeting, startedAt: '11:26' }]))

    // When
    const kinds = overlap ? suggestOverlapFixes(overlap).map((f) => f.kind) : []

    // Then only the two boundary moves are offered
    expect(kinds).toEqual(['trim-earlier', 'delay-later'])
  })

  it('offers the lossless options when one subtask sits inside the other', () => {
    // Given Meeting 10:30–11:00 entirely inside Review 10:00–11:30
    const [overlap] = findSubtaskOverlaps(period([review, { ...meeting, startedAt: '10:30', stoppedAt: '11:00' }]))

    // When
    const kinds = overlap ? suggestOverlapFixes(overlap).map((f) => f.kind) : []

    // Then moving a boundary would discard Review's tail, so it is not offered
    expect(kinds).toEqual(['untime-later', 'drop-later'])
  })
})

describe('applyOverlapFix', () => {
  const p = period([review, meeting])

  it('trims the earlier subtask and recomputes its hours', () => {
    // When Review is ended where Meeting starts
    const fixed = applyOverlapFix(p, { kind: 'trim-earlier', earlierId: 's1', laterId: 's2', at: '11:00' })

    // Then
    expect(fixed.subtasks[0]).toMatchObject({ startedAt: '10:00', stoppedAt: '11:00', hours: 1 })
    expect(fixed.subtasks[1]).toEqual(meeting)
  })

  it('delays the later subtask and recomputes its hours', () => {
    // When Meeting is started where Review stops
    const fixed = applyOverlapFix(p, { kind: 'delay-later', earlierId: 's1', laterId: 's2', at: '11:30' })

    // Then
    expect(fixed.subtasks[0]).toEqual(review)
    expect(fixed.subtasks[1]).toMatchObject({ startedAt: '11:30', stoppedAt: '12:15', hours: 0.75 })
  })

  it('splits the clash between both subtasks', () => {
    // When the boundary is put in the middle of the overlap
    const fixed = applyOverlapFix(p, { kind: 'split', earlierId: 's1', laterId: 's2', at: '11:15' })

    // Then both meet there and neither claims the same minute
    expect(fixed.subtasks[0]).toMatchObject({ stoppedAt: '11:15', hours: 1.25 })
    expect(fixed.subtasks[1]).toMatchObject({ startedAt: '11:15', hours: 1 })
  })

  it('keeps the hours when the later subtask loses its times', () => {
    // When Meeting becomes duration-only
    const fixed = applyOverlapFix(p, { kind: 'untime-later', earlierId: 's1', laterId: 's2' })

    // Then
    expect(fixed.subtasks[1]).toEqual({
      id: 's2',
      category: 'Meeting',
      hours: 1.25,
      startedAt: undefined,
      stoppedAt: undefined,
    })
  })

  it('drops the later subtask', () => {
    // When Meeting is deleted
    const fixed = applyOverlapFix(p, { kind: 'drop-later', earlierId: 's1', laterId: 's2' })

    // Then
    expect(fixed.subtasks).toEqual([review])
  })

  it('leaves the rest of the period untouched', () => {
    // When any fix is applied
    const fixed = applyOverlapFix(p, { kind: 'split', earlierId: 's1', laterId: 's2', at: '11:15' })

    // Then the period's own times and category are unchanged
    expect(fixed).toMatchObject({ id: 'p', start: '09:00', end: '17:00', category: 'Work' })
  })

  it('clears the overlap it was suggested for', () => {
    // Given a clashing pair
    const [overlap] = findSubtaskOverlaps(p)
    const fixes = overlap ? suggestOverlapFixes(overlap) : []

    // When each suggestion is applied in turn
    // Then none of them leaves an overlap behind
    for (const fix of fixes) {
      expect(findSubtaskOverlaps(applyOverlapFix(p, fix))).toEqual([])
    }
  })
})
