// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  upsertWindow,
  removeWindow,
  updatePeriodCategory,
  upsertSubtask,
  removeSubtask,
  startLiveSubtask,
  stopLiveSubtask,
  resumeSubtask,
  stopPeriod,
} from './day-updaters'
import type { Day, WorkPeriod, WorkPeriodSubtask } from './types'

function emptyDay(): Day {
  return { windows: [] }
}

function win(id: string, start: string, end: string | null, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

function subtask(id: string, category: string, hours: number): WorkPeriodSubtask {
  return { id, category, hours }
}

function liveSubtask(id: string, category: string, startedAt: string): WorkPeriodSubtask & { startedAt: string } {
  return { id, category, hours: 0, startedAt }
}

function timedSubtask(id: string, category: string, startedAt: string, stoppedAt: string): WorkPeriodSubtask {
  return { id, category, hours: 0, startedAt, stoppedAt }
}

describe('upsertWindow', () => {
  it('adds window when none with that id exists', () => {
    const day = emptyDay()
    const result = upsertWindow(day, win('w1', '08:00', '12:00'))
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.id).toBe('w1')
  })

  it('replaces window with same id', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = upsertWindow(day, win('w1', '09:00', '17:00'))
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.start).toBe('09:00')
  })

  it('preserves other windows', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00'), win('w2', '13:00', '17:00')] }
    const result = upsertWindow(day, win('w1', '09:00', '12:00'))
    expect(result.windows).toHaveLength(2)
    expect(result.windows.find((w) => w.id === 'w2')).toBeDefined()
  })
})

describe('removeWindow', () => {
  it('removes window with matching id', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00'), win('w2', '13:00', '17:00')] }
    const result = removeWindow(day, 'w1')
    expect(result.windows).toHaveLength(1)
    expect(result.windows[0]?.id).toBe('w2')
  })

  it('is a no-op when id does not exist', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = removeWindow(day, 'missing')
    expect(result.windows).toHaveLength(1)
  })
})

describe('updatePeriodCategory', () => {
  it('updates the category of the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00', '_COREMEDIA')] }
    const result = updatePeriodCategory(day, 'w1', '_RELEASE')
    expect(result.windows[0]?.category).toBe('_RELEASE')
  })

  it('leaves other periods unchanged', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00'), win('w2', '13:00', '17:00')] }
    const result = updatePeriodCategory(day, 'w1', '_SUPPORT')
    expect(result.windows.find((w) => w.id === 'w2')?.category).toBe('_COREMEDIA')
  })
})

describe('upsertSubtask', () => {
  it('adds a slice to the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = upsertSubtask(day, 'w1', subtask('s1', '_SUPPORT', 1))
    expect(result.windows[0]?.subtasks).toHaveLength(1)
    expect(result.windows[0]?.subtasks[0]?.category).toBe('_SUPPORT')
  })

  it('replaces a slice with the same id', () => {
    const dayWithSlice = {
      ...emptyDay(),
      windows: [{ ...win('w1', '08:00', '12:00'), subtasks: [subtask('s1', '_SUPPORT', 1)] }],
    }
    const result = upsertSubtask(dayWithSlice, 'w1', subtask('s1', '_SUPPORT', 2))
    expect(result.windows[0]?.subtasks).toHaveLength(1)
    expect(result.windows[0]?.subtasks[0]?.hours).toBe(2)
  })

  it('preserves slice order when updating an existing slice', () => {
    const day = {
      ...emptyDay(),
      windows: [
        {
          ...win('w1', '08:00', '12:00'),
          subtasks: [subtask('s1', '_SUPPORT', 1), subtask('s2', '_GUILDS', 2), subtask('s3', '_DEV', 3)],
        },
      ],
    }
    const result = upsertSubtask(day, 'w1', subtask('s2', '_GUILDS', 99))
    const ids = result.windows[0]?.subtasks.map((s) => s.id)
    expect(ids).toEqual(['s1', 's2', 's3'])
    expect(result.windows[0]?.subtasks[1]?.hours).toBe(99)
  })
})

describe('removeSubtask', () => {
  it('removes a slice by id', () => {
    const day = {
      ...emptyDay(),
      windows: [
        { ...win('w1', '08:00', '12:00'), subtasks: [subtask('s1', '_SUPPORT', 1), subtask('s2', '_GUILDS', 2)] },
      ],
    }
    const result = removeSubtask(day, 'w1', 's1')
    expect(result.windows[0]?.subtasks).toHaveLength(1)
    expect(result.windows[0]?.subtasks[0]?.id).toBe('s2')
  })
})

describe('startLiveSubtask', () => {
  it('adds a live slice to the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '09:00', null)] }
    const incoming = liveSubtask('s1', '_SUPPORT', '09:30')
    const result = startLiveSubtask(day, 'w1', incoming)
    expect(result.windows[0]?.subtasks).toHaveLength(1)
    expect(result.windows[0]?.subtasks[0]?.startedAt).toBe('09:30')
    expect(result.windows[0]?.subtasks[0]?.hours).toBe(0)
  })

  it('auto-stops any existing live slice using the new slice startedAt', () => {
    const existingLive = liveSubtask('s1', '_SUPPORT', '09:00')
    const day = { ...emptyDay(), windows: [{ ...win('w1', '09:00', null), subtasks: [existingLive] }] }
    const incoming = liveSubtask('s2', '_RELEASE', '10:30')
    const result = startLiveSubtask(day, 'w1', incoming)
    const subtasks = result.windows[0]?.subtasks ?? []
    expect(subtasks).toHaveLength(2)
    const stopped = subtasks.find((s) => s.id === 's1')
    expect(stopped?.startedAt).toBe('09:00')
    expect(stopped?.stoppedAt).toBe('10:30')
    expect(stopped?.hours).toBe(1.5)
    expect(subtasks.find((s) => s.id === 's2')?.startedAt).toBe('10:30')
  })

  it('does not touch other periods', () => {
    const day = { ...emptyDay(), windows: [win('w1', '09:00', null), win('w2', '13:00', null)] }
    const result = startLiveSubtask(day, 'w1', liveSubtask('s1', '_SUPPORT', '09:30'))
    expect(result.windows.find((w) => w.id === 'w2')?.subtasks).toHaveLength(0)
  })
})

describe('stopLiveSubtask', () => {
  it('extends period end when stoppedAt is after the period end', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', '17:00'), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSubtask(day, 'w1', 's1', '17:30')
    expect(result.windows[0]?.end).toBe('17:30')
  })

  it('does not change period end when stoppedAt is before the period end', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', '17:00'), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSubtask(day, 'w1', 's1', '16:00')
    expect(result.windows[0]?.end).toBe('17:00')
  })

  it('does not change period end when period has no end (null)', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSubtask(day, 'w1', 's1', '10:30')
    expect(result.windows[0]?.end).toBeNull()
  })

  it('fills hours and sets stoppedAt on the matching slice', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSubtask(day, 'w1', 's1', '10:30')
    const s = result.windows[0]?.subtasks[0]
    expect(s?.hours).toBe(1.5)
    expect(s?.startedAt).toBe('09:00')
    expect(s?.stoppedAt).toBe('10:30')
  })

  it('computes exact minutes (e.g. 73 min = 73/60 h)', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSubtask(day, 'w1', 's1', '10:13')
    expect(result.windows[0]?.subtasks[0]?.hours).toBeCloseTo(73 / 60, 10)
  })

  it('does not modify non-live subtasks', () => {
    const day = {
      ...emptyDay(),
      windows: [
        {
          ...win('w1', '09:00', null),
          subtasks: [subtask('s1', '_GUILDS', 2), liveSubtask('s2', '_SUPPORT', '09:00')],
        },
      ],
    }
    const result = stopLiveSubtask(day, 'w1', 's2', '10:00')
    const s1 = result.windows[0]?.subtasks.find((s) => s.id === 's1')
    expect(s1?.hours).toBe(2)
    expect(s1?.startedAt).toBeUndefined()
  })

  it('does not touch other periods', () => {
    const day = {
      ...emptyDay(),
      windows: [
        { ...win('w1', '09:00', null), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] },
        { ...win('w2', '13:00', null), subtasks: [liveSubtask('s2', '_GUILDS', '13:00')] },
      ],
    }
    const result = stopLiveSubtask(day, 'w1', 's1', '10:00')
    const s2 = result.windows.find((w) => w.id === 'w2')?.subtasks[0]
    expect(s2?.startedAt).toBe('13:00')
  })
})

describe('resumeSubtask', () => {
  it('clears stoppedAt on the matching slice and reopens the period', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', '11:00'), subtasks: [timedSubtask('s1', '_SUPPORT', '09:00', '10:00')] }],
    }
    const result = resumeSubtask(day, 'w1', 's1', '10:30')
    expect(result.windows[0]?.end).toBeNull()
    const s1 = result.windows[0]?.subtasks.find((s) => s.id === 's1')
    expect(s1?.startedAt).toBe('09:00')
    expect(s1?.stoppedAt).toBeUndefined()
  })

  it('auto-stops any other currently-live slice at `now`', () => {
    const day = {
      ...emptyDay(),
      windows: [
        {
          ...win('w1', '09:00', null),
          subtasks: [timedSubtask('s1', '_SUPPORT', '09:00', '10:00'), liveSubtask('s2', '_RELEASE', '10:00')],
        },
      ],
    }
    const result = resumeSubtask(day, 'w1', 's1', '11:00')
    const subtasks = result.windows[0]?.subtasks ?? []
    const s1 = subtasks.find((s) => s.id === 's1')
    const s2 = subtasks.find((s) => s.id === 's2')
    expect(s1?.stoppedAt).toBeUndefined()
    expect(s2?.stoppedAt).toBe('11:00')
    expect(s2?.hours).toBe(1)
  })

  it('is a no-op when the subtask has no startedAt', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', '11:00'), subtasks: [subtask('s1', '_SUPPORT', 1)] }],
    }
    const result = resumeSubtask(day, 'w1', 's1', '10:30')
    expect(result.windows[0]?.end).toBe('11:00')
    expect(result.windows[0]?.subtasks[0]?.startedAt).toBeUndefined()
  })

  it('does not touch other periods', () => {
    const day = {
      ...emptyDay(),
      windows: [
        { ...win('w1', '09:00', '11:00'), subtasks: [timedSubtask('s1', '_SUPPORT', '09:00', '10:00')] },
        win('w2', '13:00', '17:00'),
      ],
    }
    const result = resumeSubtask(day, 'w1', 's1', '10:30')
    expect(result.windows.find((w) => w.id === 'w2')?.end).toBe('17:00')
  })
})

describe('stopPeriod', () => {
  it('sets period end to the given time', () => {
    const day = { ...emptyDay(), windows: [win('w1', '09:00', null)] }
    const result = stopPeriod(day, 'w1', '17:00')
    expect(result.windows[0]?.end).toBe('17:00')
  })

  it('also stops the live slice when liveSubtaskId and stoppedAt are provided', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), subtasks: [liveSubtask('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopPeriod(day, 'w1', '11:00', 's1', '11:00')
    expect(result.windows[0]?.end).toBe('11:00')
    expect(result.windows[0]?.subtasks[0]?.hours).toBe(2)
    expect(result.windows[0]?.subtasks[0]?.startedAt).toBe('09:00')
    expect(result.windows[0]?.subtasks[0]?.stoppedAt).toBe('11:00')
  })

  it('only sets period end when no liveSubtaskId is given', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), subtasks: [subtask('s1', '_GUILDS', 1)] }],
    }
    const result = stopPeriod(day, 'w1', '17:00')
    expect(result.windows[0]?.end).toBe('17:00')
    expect(result.windows[0]?.subtasks[0]?.hours).toBe(1)
  })

  it('does not touch other periods', () => {
    const day = {
      ...emptyDay(),
      windows: [win('w1', '09:00', null), win('w2', '13:00', null)],
    }
    const result = stopPeriod(day, 'w1', '12:00')
    expect(result.windows.find((w) => w.id === 'w2')?.end).toBeNull()
  })
})
