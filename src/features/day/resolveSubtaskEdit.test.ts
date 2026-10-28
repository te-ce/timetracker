import { describe, it, expect } from 'vitest'
import { resolveSubtaskEdit } from './resolveSubtaskEdit'

describe('resolveSubtaskEdit', () => {
  it('refuses to clear the end of a stopped subtask, which would make it live again with its old hours', () => {
    const stopped = { id: 's', category: 'A', hours: 1, startedAt: '10:00', stoppedAt: '11:00' }
    expect(resolveSubtaskEdit(stopped, 'A', undefined, '10:00', '', '1', 'timed').valid).toBe(false)
  })

  it('still lets a live subtask be edited without an end', () => {
    const live = { id: 's', category: 'A', hours: 0, startedAt: '10:00' }
    const { subtask, valid } = resolveSubtaskEdit(live, 'B', undefined, '10:15', '', '0', 'timed')
    expect(valid).toBe(true)
    expect(subtask).toMatchObject({ category: 'B', startedAt: '10:15', hours: 0 })
  })
})
