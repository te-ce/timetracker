import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encodeSharesUrl, listSheets, listRows, writeSprintData } from './excelService'

const FAKE_URL = 'https://company.sharepoint.com/sites/team/Shared%20Documents/time.xlsx'
const TOKEN = 'test-token'

function encoded(): string {
  return encodeSharesUrl(FAKE_URL)
}

function workbookBase(): string {
  return `https://graph.microsoft.com/v1.0/shares/${encoded()}/driveItem/workbook`
}

describe('encodeSharesUrl', () => {
  it('produces a u! prefixed base64url string', () => {
    const result = encodeSharesUrl(FAKE_URL)
    expect(result).toMatch(/^u!/)
    // No standard base64 padding chars
    expect(result).not.toContain('=')
    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
  })

  it('is deterministic', () => {
    expect(encodeSharesUrl(FAKE_URL)).toBe(encodeSharesUrl(FAKE_URL))
  })
})

describe('listSheets', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns sheet names from Graph API response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: [{ name: 'Sprint 1' }, { name: 'Sprint 2' }] }),
      }),
    )

    const sheets = await listSheets(FAKE_URL, TOKEN)
    expect(sheets).toEqual(['Sprint 1', 'Sprint 2'])
    expect(fetch).toHaveBeenCalledWith(`${workbookBase()}/worksheets`, expect.objectContaining({
      headers: { Authorization: `Bearer ${TOKEN}` },
    }))
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }),
    )
    await expect(listSheets(FAKE_URL, TOKEN)).rejects.toThrow('listSheets failed: 401')
  })
})

describe('listRows', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns rows with non-empty Task IDs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          values: [
            ['TASK-001', 0, 'On Leave'],
            ['TASK-002', 0, 'Training'],
            ['', 0, 'ignored'],
          ],
        }),
      }),
    )

    const rows = await listRows(FAKE_URL, 'Sprint 1', TOKEN)
    expect(rows).toEqual([
      { taskId: 'TASK-001', description: 'On Leave' },
      { taskId: 'TASK-002', description: 'Training' },
    ])
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' }),
    )
    await expect(listRows(FAKE_URL, 'Sprint 1', TOKEN)).rejects.toThrow('listRows failed: 403')
  })
})

describe('writeSprintData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('PATCHes effort values for mapped categories', async () => {
    const patchCalls: string[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && opts?.method === 'PATCH') {
          patchCalls.push(url)
          return Promise.resolve({ ok: true })
        }
        // Both GET calls return the same used-range response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            values: [
              ['TASK-001', 0, 'On Leave'],
              ['TASK-002', 0, 'Training'],
            ],
            address: "Sprint 1!A1:C2",
          }),
        })
      }),
    )

    const mapping = { '_LEAVE': 'TASK-001', '_OTHER': 'TASK-002' }
    const hours = { '_LEAVE': 8, '_OTHER': 4 }
    await writeSprintData(FAKE_URL, 'Sprint 1', mapping, hours, TOKEN)

    expect(patchCalls).toHaveLength(2)
    expect(patchCalls.some((u) => u.includes('B1'))).toBe(true)
    expect(patchCalls.some((u) => u.includes('B2'))).toBe(true)
  })

  it('skips categories not in the used range', async () => {
    const patchCalls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && opts?.method === 'PATCH') {
          patchCalls.push(url)
          return Promise.resolve({ ok: true })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            values: [['TASK-001', 0, 'On Leave']],
            address: 'Sprint 1!A1:C1',
          }),
        })
      }),
    )

    // _OTHER maps to TASK-999 which is not in the sheet
    await writeSprintData(FAKE_URL, 'Sprint 1', { '_LEAVE': 'TASK-001', '_OTHER': 'TASK-999' }, { '_LEAVE': 5, '_OTHER': 3 }, TOKEN)
    expect(patchCalls).toHaveLength(1)
  })
})
