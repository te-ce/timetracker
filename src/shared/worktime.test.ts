// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calculateWorkedHours,
  calculateRestarbeitszeit,
  calcSubtaskHours,
  hasOpenPeriod,
  findOpenPeriod,
  isPlannedStop,
  findPlannedStopPeriod,
  calculateProjectedWorkedHours,
  derivePlannedStopState,
  elapsedHours,
} from './worktime'
import type { WorkPeriod } from '../infra/repositories/types'

const makeWindow = (start: string, end: string | null): WorkPeriod => ({
  id: '1',
  start,
  end,
  category: '',
  subtasks: [],
})

describe('elapsedHours', () => {
  it('returns hours between start and end', () => {
    expect(elapsedHours('09:00', '10:30')).toBe(1.5)
  })

  it('wraps past midnight when end is before start', () => {
    expect(elapsedHours('23:00', '01:00')).toBe(2)
  })

  it('returns 0 when start equals end', () => {
    expect(elapsedHours('09:00', '09:00')).toBe(0)
  })

  it('without race tolerance, a small negative diff wraps to nearly 24h', () => {
    expect(elapsedHours('09:03', '09:00')).toBeCloseTo(23.95, 5)
  })

  it('with race tolerance, a small negative diff within the window clamps to 0', () => {
    expect(elapsedHours('09:03', '09:00', { raceToleranceMinutes: 5 })).toBe(0)
  })

  it('with race tolerance, a negative diff beyond the window still wraps', () => {
    expect(elapsedHours('09:10', '09:00', { raceToleranceMinutes: 5 })).toBeCloseTo(23.833, 3)
  })
})

describe('calculateWorkedHours', () => {
  it('returns 0 when there are no WorkPeriods', () => {
    expect(calculateWorkedHours([])).toBe(0)
  })

  it('returns the duration in decimal hours for a single WorkPeriod', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '17:00')])).toBe(8)
  })

  it('sums durations across multiple WorkPeriods', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', '17:00')]
    expect(calculateWorkedHours(windows)).toBe(7)
  })

  it('handles fractional hours (30-minute window → 0.5h)', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '09:30')])).toBe(0.5)
  })

  it('handles a WorkPeriod that spans midnight', () => {
    expect(calculateWorkedHours([makeWindow('23:00', '01:00')])).toBe(2)
  })

  it('skips an open WorkPeriod (null end) when no now is provided', () => {
    expect(calculateWorkedHours([makeWindow('09:00', null)])).toBe(0)
  })

  it('skips open windows but counts closed ones in a mixed list', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', null)]
    expect(calculateWorkedHours(windows)).toBe(3)
  })

  it('includes open window live duration when now is provided', () => {
    const windows = [makeWindow('09:00', null)]
    expect(calculateWorkedHours(windows, '11:00')).toBe(2)
  })

  it('sums closed and open windows when now is provided', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', null)]
    expect(calculateWorkedHours(windows, '15:00')).toBe(5)
  })

  it('returns 0 for open period when now is 1 minute behind start (minute-boundary race)', () => {
    // Race: work period starts at 13:47, but nowTime tick is still 13:46
    const windows = [makeWindow('13:47', null)]
    expect(calculateWorkedHours(windows, '13:46')).toBe(0)
  })

  it('returns 0 for open period when now equals start (no elapsed)', () => {
    const windows = [makeWindow('13:47', null)]
    expect(calculateWorkedHours(windows, '13:47')).toBe(0)
  })
})

describe('calcSubtaskHours', () => {
  it('computes exact decimal hours between two times', () => {
    expect(calcSubtaskHours('09:00', '10:30')).toBe(1.5)
  })

  it('computes fractional minutes exactly (73 min = 73/60 h)', () => {
    expect(calcSubtaskHours('09:00', '10:13')).toBeCloseTo(73 / 60, 10)
  })

  it('returns 0 when start and stop are the same', () => {
    expect(calcSubtaskHours('09:00', '09:00')).toBe(0)
  })

  it('handles midnight crossing (23:00 → 01:00 = 2h)', () => {
    expect(calcSubtaskHours('23:00', '01:00')).toBe(2)
  })
})

describe('hasOpenPeriod', () => {
  it('returns false for empty list', () => {
    expect(hasOpenPeriod([])).toBe(false)
  })

  it('returns false when all periods are closed', () => {
    expect(hasOpenPeriod([makeWindow('09:00', '10:00'), makeWindow('11:00', '12:00')])).toBe(false)
  })

  it('returns true when any period has end === null', () => {
    expect(hasOpenPeriod([makeWindow('09:00', null)])).toBe(true)
  })

  it('returns true when open period is mixed with closed ones', () => {
    expect(hasOpenPeriod([makeWindow('09:00', '10:00'), makeWindow('11:00', null)])).toBe(true)
  })
})

describe('findOpenPeriod', () => {
  it('returns undefined for empty list', () => {
    expect(findOpenPeriod([])).toBeUndefined()
  })

  it('returns undefined when all periods are closed', () => {
    expect(findOpenPeriod([makeWindow('09:00', '10:00')])).toBeUndefined()
  })

  it('returns the open period', () => {
    const open = makeWindow('11:00', null)
    expect(findOpenPeriod([makeWindow('09:00', '10:00'), open])).toBe(open)
  })

  it('returns the first open period in the list', () => {
    const first = makeWindow('09:00', null)
    const second = { ...makeWindow('11:00', null), id: '2' }
    expect(findOpenPeriod([first, second])).toBe(first)
  })
})

describe('calculateRestarbeitszeit', () => {
  it('returns a positive value and isOvertime=false when hours are missing', () => {
    // Given: 8h target, only 6h worked
    const result = calculateRestarbeitszeit(8, 6)
    expect(result.value).toBe(2)
    expect(result.isOvertime).toBe(false)
  })

  it('returns a negative value and isOvertime=true when overtime is worked', () => {
    // Given: 8h target, 9.5h worked
    const result = calculateRestarbeitszeit(8, 9.5)
    expect(result.value).toBe(-1.5)
    expect(result.isOvertime).toBe(true)
  })

  it('returns value=0 and isOvertime=false when WorkedHours exactly meets Sollstunden', () => {
    const result = calculateRestarbeitszeit(8, 8)
    expect(result.value).toBe(0)
    expect(result.isOvertime).toBe(false)
  })
})

describe('isPlannedStop', () => {
  it('returns false when end is null (open period)', () => {
    expect(isPlannedStop(makeWindow('09:00', null), '15:00')).toBe(false)
  })

  it('returns false when end is in the past relative to now', () => {
    expect(isPlannedStop(makeWindow('09:00', '14:00'), '15:00')).toBe(false)
  })

  it('returns false when end equals now', () => {
    expect(isPlannedStop(makeWindow('09:00', '15:00'), '15:00')).toBe(false)
  })

  it('returns true when end is in the future relative to now', () => {
    expect(isPlannedStop(makeWindow('09:00', '17:00'), '15:00')).toBe(true)
  })

  it('returns true when end is one minute ahead', () => {
    expect(isPlannedStop(makeWindow('09:00', '15:01'), '15:00')).toBe(true)
  })
})

describe('findPlannedStopPeriod', () => {
  it('returns undefined when windows is empty', () => {
    expect(findPlannedStopPeriod([], '15:00')).toBeUndefined()
  })

  it('returns undefined when no period has a future end', () => {
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', null)]
    expect(findPlannedStopPeriod(windows, '15:00')).toBeUndefined()
  })

  it('returns the period whose end is in the future', () => {
    const planned = makeWindow('09:00', '17:00')
    expect(findPlannedStopPeriod([makeWindow('07:00', '08:00'), planned], '15:00')).toBe(planned)
  })
})

describe('calculateProjectedWorkedHours', () => {
  it('returns 0 for empty windows', () => {
    expect(calculateProjectedWorkedHours([], '15:00')).toBe(0)
  })

  it('uses end − start for closed past periods', () => {
    expect(calculateProjectedWorkedHours([makeWindow('09:00', '12:00')], '15:00')).toBe(3)
  })

  it('uses end − start (full planned duration) for a planned-stop period', () => {
    // Period runs 09:00–17:00, now is 15:00 → projected = 8h
    expect(calculateProjectedWorkedHours([makeWindow('09:00', '17:00')], '15:00')).toBe(8)
  })

  it('uses now for an open period (no planned stop)', () => {
    // Period started 09:00, now 15:00 → projected live = 6h
    expect(calculateProjectedWorkedHours([makeWindow('09:00', null)], '15:00')).toBe(6)
  })

  it('sums closed period plus full planned duration', () => {
    // Closed: 09:00–12:00 = 3h, planned: 13:00–17:00 = 4h → 7h
    const windows = [makeWindow('09:00', '12:00'), makeWindow('13:00', '17:00')]
    expect(calculateProjectedWorkedHours(windows, '15:00')).toBe(7)
  })
})

describe('calculateWorkedHours with future end times', () => {
  it('treats a future end as live (uses now) when now is provided', () => {
    // Period started 09:00, planned end 17:00, now 15:00 → worked 6h (not 8h)
    expect(calculateWorkedHours([makeWindow('09:00', '17:00')], '15:00')).toBe(6)
  })

  it('still uses past end as fixed duration when end is in the past', () => {
    expect(calculateWorkedHours([makeWindow('09:00', '12:00')], '15:00')).toBe(3)
  })

  it('treats a future end as full duration when no now is provided', () => {
    // Without now: no knowledge of "future", uses end − start as-is
    expect(calculateWorkedHours([makeWindow('09:00', '17:00')])).toBe(8)
  })
})

describe('derivePlannedStopState', () => {
  it('is not in planned-stop mode when there is no planned-stop period', () => {
    const result = derivePlannedStopState([makeWindow('09:00', '12:00')], '13:00', 'planned-stop')
    expect(result).toEqual({ isPlannedStopMode: false, plannedStopTime: null, countdownHours: 0 })
  })

  it('counts down to the planned-stop end when reference is planned-stop', () => {
    const result = derivePlannedStopState([makeWindow('13:00', '17:00')], '15:00', 'planned-stop')
    expect(result).toEqual({ isPlannedStopMode: true, plannedStopTime: '17:00', countdownHours: 2 })
  })

  it('is not in planned-stop mode when reference is target-hours, even with a planned stop', () => {
    const result = derivePlannedStopState([makeWindow('13:00', '17:00')], '15:00', 'target-hours')
    expect(result).toEqual({ isPlannedStopMode: false, plannedStopTime: '17:00', countdownHours: 2 })
  })
})
