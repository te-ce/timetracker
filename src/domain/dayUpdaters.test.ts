import { describe, it, expect } from 'vitest'
import {
  upsertWindow,
  removeWindow,
  updatePeriodCategory,
  upsertSlice,
  removeSlice,
  startLiveSlice,
  stopLiveSlice,
  stopPeriod,
} from './dayUpdaters'
import type { Day, WorkPeriod, WorkPeriodSlice } from '../repositories/types'

function emptyDay(): Day {
  return { windows: [] }
}

function win(id: string, start: string, end: string | null, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, slices: [] }
}

function slice(id: string, category: string, hours: number): WorkPeriodSlice {
  return { id, category, hours }
}

function liveSlice(id: string, category: string, startedAt: string): WorkPeriodSlice {
  return { id, category, hours: 0, startedAt }
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

describe('upsertSlice', () => {
  it('adds a slice to the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '08:00', '12:00')] }
    const result = upsertSlice(day, 'w1', slice('s1', '_SUPPORT', 1))
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.category).toBe('_SUPPORT')
  })

  it('replaces a slice with the same id', () => {
    const dayWithSlice = {
      ...emptyDay(),
      windows: [{ ...win('w1', '08:00', '12:00'), slices: [slice('s1', '_SUPPORT', 1)] }],
    }
    const result = upsertSlice(dayWithSlice, 'w1', slice('s1', '_SUPPORT', 2))
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.hours).toBe(2)
  })

  it('preserves slice order when updating an existing slice', () => {
    const day = {
      ...emptyDay(),
      windows: [
        {
          ...win('w1', '08:00', '12:00'),
          slices: [slice('s1', '_SUPPORT', 1), slice('s2', '_GUILDS', 2), slice('s3', '_DEV', 3)],
        },
      ],
    }
    const result = upsertSlice(day, 'w1', slice('s2', '_GUILDS', 99))
    const ids = result.windows[0]?.slices.map((s) => s.id)
    expect(ids).toEqual(['s1', 's2', 's3'])
    expect(result.windows[0]?.slices[1]?.hours).toBe(99)
  })
})

describe('removeSlice', () => {
  it('removes a slice by id', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '08:00', '12:00'), slices: [slice('s1', '_SUPPORT', 1), slice('s2', '_GUILDS', 2)] }],
    }
    const result = removeSlice(day, 'w1', 's1')
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.id).toBe('s2')
  })
})

describe('startLiveSlice', () => {
  it('adds a live slice to the matching period', () => {
    const day = { ...emptyDay(), windows: [win('w1', '09:00', null)] }
    const incoming = liveSlice('s1', '_SUPPORT', '09:30')
    const result = startLiveSlice(day, 'w1', incoming)
    expect(result.windows[0]?.slices).toHaveLength(1)
    expect(result.windows[0]?.slices[0]?.startedAt).toBe('09:30')
    expect(result.windows[0]?.slices[0]?.hours).toBe(0)
  })

  it('auto-stops any existing live slice using the new slice startedAt', () => {
    const existingLive = liveSlice('s1', '_SUPPORT', '09:00')
    const day = { ...emptyDay(), windows: [{ ...win('w1', '09:00', null), slices: [existingLive] }] }
    const incoming = liveSlice('s2', '_RELEASE', '10:30')
    const result = startLiveSlice(day, 'w1', incoming)
    const slices = result.windows[0]?.slices ?? []
    expect(slices).toHaveLength(2)
    const stopped = slices.find((s) => s.id === 's1')
    expect(stopped?.startedAt).toBeUndefined()
    expect(stopped?.hours).toBe(1.5)
    expect(slices.find((s) => s.id === 's2')?.startedAt).toBe('10:30')
  })

  it('does not touch other periods', () => {
    const day = { ...emptyDay(), windows: [win('w1', '09:00', null), win('w2', '13:00', null)] }
    const result = startLiveSlice(day, 'w1', liveSlice('s1', '_SUPPORT', '09:30'))
    expect(result.windows.find((w) => w.id === 'w2')?.slices).toHaveLength(0)
  })
})

describe('stopLiveSlice', () => {
  it('fills hours and removes startedAt from the matching slice', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), slices: [liveSlice('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSlice(day, 'w1', 's1', '10:30')
    const s = result.windows[0]?.slices[0]
    expect(s?.hours).toBe(1.5)
    expect(s?.startedAt).toBeUndefined()
  })

  it('computes exact minutes (e.g. 73 min = 73/60 h)', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), slices: [liveSlice('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopLiveSlice(day, 'w1', 's1', '10:13')
    expect(result.windows[0]?.slices[0]?.hours).toBeCloseTo(73 / 60, 10)
  })

  it('does not modify non-live slices', () => {
    const day = {
      ...emptyDay(),
      windows: [
        {
          ...win('w1', '09:00', null),
          slices: [slice('s1', '_GUILDS', 2), liveSlice('s2', '_SUPPORT', '09:00')],
        },
      ],
    }
    const result = stopLiveSlice(day, 'w1', 's2', '10:00')
    const s1 = result.windows[0]?.slices.find((s) => s.id === 's1')
    expect(s1?.hours).toBe(2)
    expect(s1?.startedAt).toBeUndefined()
  })

  it('does not touch other periods', () => {
    const day = {
      ...emptyDay(),
      windows: [
        { ...win('w1', '09:00', null), slices: [liveSlice('s1', '_SUPPORT', '09:00')] },
        { ...win('w2', '13:00', null), slices: [liveSlice('s2', '_GUILDS', '13:00')] },
      ],
    }
    const result = stopLiveSlice(day, 'w1', 's1', '10:00')
    const s2 = result.windows.find((w) => w.id === 'w2')?.slices[0]
    expect(s2?.startedAt).toBe('13:00')
  })
})

describe('stopPeriod', () => {
  it('sets period end to the given time', () => {
    const day = { ...emptyDay(), windows: [win('w1', '09:00', null)] }
    const result = stopPeriod(day, 'w1', '17:00')
    expect(result.windows[0]?.end).toBe('17:00')
  })

  it('also stops the live slice when liveSliceId and stoppedAt are provided', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), slices: [liveSlice('s1', '_SUPPORT', '09:00')] }],
    }
    const result = stopPeriod(day, 'w1', '11:00', 's1', '11:00')
    expect(result.windows[0]?.end).toBe('11:00')
    expect(result.windows[0]?.slices[0]?.hours).toBe(2)
    expect(result.windows[0]?.slices[0]?.startedAt).toBeUndefined()
  })

  it('only sets period end when no liveSliceId is given', () => {
    const day = {
      ...emptyDay(),
      windows: [{ ...win('w1', '09:00', null), slices: [slice('s1', '_GUILDS', 1)] }],
    }
    const result = stopPeriod(day, 'w1', '17:00')
    expect(result.windows[0]?.end).toBe('17:00')
    expect(result.windows[0]?.slices[0]?.hours).toBe(1)
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
