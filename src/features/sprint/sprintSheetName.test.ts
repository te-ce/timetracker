import { describe, it, expect } from 'vitest'
import { buildArchiveSheetName } from './sprintSheetName'

describe('buildArchiveSheetName', () => {
  it('formats dates as DD.MM.YY', () => {
    const name = buildArchiveSheetName(null, '2025-06-02', '2025-06-15')
    expect(name).toBe('02.06.25 - 15.06.25')
  })

  it('includes filename prefix when provided', () => {
    const name = buildArchiveSheetName('time.xlsx', '2025-06-02', '2025-06-15')
    expect(name).toContain('02.06.25 - 15.06.25')
    expect(name).toContain('time')
  })

  it('strips .xlsx extension from filename', () => {
    const name = buildArchiveSheetName('workbook.xlsx', '2025-01-01', '2025-01-14')
    expect(name).not.toContain('.xlsx')
  })

  it('is always 31 chars or fewer', () => {
    const longName = 'a'.repeat(50) + '.xlsx'
    const name = buildArchiveSheetName(longName, '2025-06-02', '2025-06-15')
    expect(name.length).toBeLessThanOrEqual(31)
  })

  it('handles null filename with only date part', () => {
    const name = buildArchiveSheetName(null, '2025-12-01', '2025-12-14')
    expect(name).toBe('01.12.25 - 14.12.25')
    expect(name.length).toBeLessThanOrEqual(31)
  })
})
