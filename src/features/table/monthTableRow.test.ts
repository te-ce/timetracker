// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildMonthTable } from './buildMonthTable'
import { classifyRow } from './monthTableRow'
import type { MonthData } from '../../infra/repositories/types'

describe('classifyRow', () => {
  it('marks a past day with a never-stopped period as needs-review', () => {
    const monthData: MonthData = {
      '2026-05-18': { windows: [{ id: 'a', start: '09:00', end: null, category: '_COREMEDIA', subtasks: [] }] },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map(), today: '2026-05-19' })
    const result = classifyRow(rows[17]!, '2026-05-19')
    expect(result.displayStatus).toBe('needs-review')
    expect(result.reason).toMatch(/never stopped/i)
  })

  it('marks a past day with an inverted period range as needs-review', () => {
    const monthData: MonthData = {
      '2026-05-18': { windows: [{ id: 'a', start: '22:00', end: '02:00', category: '_COREMEDIA', subtasks: [] }] },
    }
    const rows = buildMonthTable({ year: 2026, month: 5, monthData, dayTypes: new Map(), today: '2026-05-19' })
    expect(classifyRow(rows[17]!, '2026-05-19').displayStatus).toBe('needs-review')
  })
})
