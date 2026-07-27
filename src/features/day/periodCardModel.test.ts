// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computePeriodCardModel } from './periodCardModel'
import type { WorkPeriod } from '../../infra/repositories/types'

function period(start: string, end: string | null, subtasks: WorkPeriod['subtasks'] = []): WorkPeriod {
  return { id: 'p1', start, end, category: '_COREMEDIA', subtasks }
}

describe('computePeriodCardModel', () => {
  it('reports a closed period as not running with full duration as remainder', () => {
    const model = computePeriodCardModel(period('09:00', '11:00'), '11:00')
    expect(model.isRunning).toBe(false)
    expect(model.duration).toBeCloseTo(2)
    expect(model.displayRemainder).toBeCloseTo(2)
  })

  it('treats an open period as running and uses now for live duration', () => {
    const model = computePeriodCardModel(period('09:00', null), '10:30')
    expect(model.isRunning).toBe(true)
    expect(model.canStartLiveSubtask).toBe(true)
    expect(model.duration).toBeCloseTo(1.5)
  })

  it('allows starting a live subtask on a planned-stop period', () => {
    const model = computePeriodCardModel(period('09:00', '12:00'), '10:00')
    expect(model.canStartLiveSubtask).toBe(true)
  })

  it('forbids starting a live subtask once the planned stop has passed', () => {
    const model = computePeriodCardModel(period('09:00', '11:00'), '11:30')
    expect(model.canStartLiveSubtask).toBe(false)
  })

  it('subtracts completed subtask hours from the remainder', () => {
    const model = computePeriodCardModel(
      period('09:00', '11:00', [{ id: 's1', category: '_SUPPORT', hours: 1 }]),
      '11:00',
    )
    expect(model.displayRemainder).toBeCloseTo(1)
  })

  it('flags overbooked when completed subtasks exceed the period duration', () => {
    const model = computePeriodCardModel(
      period('09:00', '10:00', [{ id: 's1', category: '_SUPPORT', hours: 2 }]),
      '10:00',
    )
    expect(model.overbooked).toBe(true)
  })

  it('never flags overbooked while the period is still running', () => {
    const model = computePeriodCardModel(
      period('09:00', null, [{ id: 's1', category: '_SUPPORT', hours: 99 }]),
      '10:00',
    )
    expect(model.overbooked).toBe(false)
  })

  it('flags overlapping timed subtasks', () => {
    const model = computePeriodCardModel(
      period('09:00', '11:00', [
        { id: 's1', category: '_SUPPORT', hours: 1, startedAt: '09:00', stoppedAt: '10:00' },
        { id: 's2', category: '_RELEASE', hours: 0.5, startedAt: '09:30', stoppedAt: '10:00' },
      ]),
      '11:00',
    )
    expect(model.hasOverlap).toBe(true)
    expect(model.overlappingIds).toEqual(new Set(['s1', 's2']))
  })

  it('does not flag non-overlapping timed subtasks', () => {
    const model = computePeriodCardModel(
      period('09:00', '11:00', [
        { id: 's1', category: '_SUPPORT', hours: 1, startedAt: '09:00', stoppedAt: '10:00' },
        { id: 's2', category: '_RELEASE', hours: 1, startedAt: '10:00', stoppedAt: '11:00' },
      ]),
      '11:00',
    )
    expect(model.hasOverlap).toBe(false)
  })

  it('excludes the live subtask from completedSubtasks and reduces displayRemainder by its elapsed time', () => {
    const model = computePeriodCardModel(
      period('09:00', null, [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '09:00' }]),
      '09:30',
    )
    expect(model.completedSubtasks).toEqual([])
    expect(model.liveSubtask?.id).toBe('s1')
    // duration so far = 0.5h, live subtask elapsed = 0.5h -> remainder driven to 0
    expect(model.displayRemainder).toBeCloseTo(0)
  })
})
