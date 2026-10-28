import { describe, it, expect } from 'vitest'
import type { WorkPeriod } from '../infra/repositories/types'
import { withPeriodTimes } from './periodTimes'

const running: WorkPeriod = {
  id: 'p1',
  start: '09:00',
  end: null,
  category: 'Work',
  subtasks: [
    { id: 'done', category: 'Meeting', hours: 0.5, startedAt: '09:00', stoppedAt: '09:30' },
    { id: 'live', category: 'Review', hours: 0, startedAt: '10:00' },
  ],
}

describe('withPeriodTimes', () => {
  it('stops a live subtask at the new end', () => {
    const updated = withPeriodTimes(running, '09:00', '11:30')
    expect(updated).toMatchObject({ start: '09:00', end: '11:30' })
    expect(updated.subtasks[1]).toMatchObject({ stoppedAt: '11:30', hours: 1.5 })
  })

  it('leaves finished subtasks alone', () => {
    expect(withPeriodTimes(running, '09:00', '11:30').subtasks[0]).toBe(running.subtasks[0])
  })

  it('keeps a live subtask running while the period stays open', () => {
    expect(withPeriodTimes(running, '08:45', null)).toMatchObject({
      start: '08:45',
      end: null,
      subtasks: running.subtasks,
    })
  })
})
