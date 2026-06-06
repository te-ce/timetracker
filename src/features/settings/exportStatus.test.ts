// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { shouldAutoExport } from './exportStatus'
import type { Sprint } from '../sprint'

const sprint: Sprint = { index: 5, start: '2026-05-05', end: '2026-05-16' }

describe('shouldAutoExport', () => {
  it('returns false when sprint is already exported', () => {
    const result = shouldAutoExport(
      sprint,
      { sprintIndex: 5, status: 'exported', exportedAt: '2026-05-17' },
      3,
      '2026-05-20',
    )
    expect(result).toBe(false)
  })

  it('returns false when delay has not passed since sprint end', () => {
    const result = shouldAutoExport(
      sprint,
      { sprintIndex: 5, status: 'pending', exportedAt: null },
      3,
      '2026-05-18', // only 2 days after end (May 16)
    )
    expect(result).toBe(false)
  })

  it('returns true when pending and delay has passed', () => {
    const result = shouldAutoExport(
      sprint,
      { sprintIndex: 5, status: 'pending', exportedAt: null },
      3,
      '2026-05-20', // 4 days after end
    )
    expect(result).toBe(true)
  })

  it('returns false for a sprint that has not ended yet', () => {
    const result = shouldAutoExport(
      sprint,
      { sprintIndex: 5, status: 'pending', exportedAt: null },
      0,
      '2026-05-10', // mid-sprint
    )
    expect(result).toBe(false)
  })

  it('returns true with delay=0 on the day after sprint ends', () => {
    const result = shouldAutoExport(
      sprint,
      { sprintIndex: 5, status: 'pending', exportedAt: null },
      0,
      '2026-05-17', // 1 day after end
    )
    expect(result).toBe(true)
  })

  it('returns false with delay=0 on the exact end day', () => {
    const result = shouldAutoExport(
      sprint,
      { sprintIndex: 5, status: 'pending', exportedAt: null },
      0,
      '2026-05-16', // exact end day
    )
    expect(result).toBe(false)
  })
})
