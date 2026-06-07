// @vitest-environment node
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
    expect(result).not.toContain('=')
    expect(result).not.toContain('+')
    expect(result).not.toContain('/')
  })

  it('is deterministic', () => {
    expect(encodeSharesUrl(FAKE_URL)).toBe(encodeSharesUrl(FAKE_URL))
  })

  it('encodes the SharePoint URL to the correct base64url representation', () => {
    const result = encodeSharesUrl(FAKE_URL)
    // Compute expected independently: btoa → replace chars → strip padding
    const raw = btoa(`u=${FAKE_URL}`)
    const expected = `u!${raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
    expect(result).toBe(expected)
  })

  it('strips all trailing = padding including double ==', () => {
    // 'u=ab' is 4 bytes → base64 produces == padding; result must have no =
    const result = encodeSharesUrl('ab')
    expect(result).not.toContain('=')
    expect(result.startsWith('u!')).toBe(true)
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
    expect(fetch).toHaveBeenCalledWith(
      `${workbookBase()}/worksheets`,
      expect.objectContaining({
        headers: { Authorization: `Bearer ${TOKEN}` },
      }),
    )
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }))
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
        json: () =>
          Promise.resolve({
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' }))
    await expect(listRows(FAKE_URL, 'Sprint 1', TOKEN)).rejects.toThrow('listRows failed: 403')
  })

  it('filters out rows with whitespace-only task IDs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            values: [
              ['  ', 0, 'ignored'],
              ['TASK-1', 0, 'kept'],
            ],
          }),
      }),
    )
    const rows = await listRows(FAKE_URL, 'Sprint 1', TOKEN)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.taskId).toBe('TASK-1')
  })

  it('trims whitespace from taskId in mapped rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ values: [['  TASK-1  ', 0, 'desc']] }),
      }),
    )
    const rows = await listRows(FAKE_URL, 'Sprint 1', TOKEN)
    expect(rows[0]!.taskId).toBe('TASK-1')
  })

  it('returns empty string description when col3 is not a string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ values: [['TASK-1', 0, 42]] }),
      }),
    )
    const rows = await listRows(FAKE_URL, 'Sprint 1', TOKEN)
    expect(rows[0]!.description).toBe('')
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
          json: () =>
            Promise.resolve({
              values: [
                ['TASK-001', 0, 'On Leave'],
                ['TASK-002', 0, 'Training'],
              ],
              address: 'Sprint 1!A1:C2',
            }),
        })
      }),
    )

    const mapping = { _LEAVE: 'TASK-001', _OTHER: 'TASK-002' }
    const hours = { _LEAVE: 8, _OTHER: 4 }
    await writeSprintData(FAKE_URL, 'Sprint 1', mapping, hours, TOKEN)

    expect(patchCalls).toHaveLength(2)
    expect(patchCalls.some((u) => u.includes('B1'))).toBe(true)
    expect(patchCalls.some((u) => u.includes('B2'))).toBe(true)
  })

  it('throws when the range address fetch fails', async () => {
    let getCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') return Promise.resolve({ ok: true })
        getCount++
        if (getCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ values: [['TASK-001', 0, 'desc']], address: 'S!A1:C1' }),
          })
        }
        return Promise.resolve({ ok: false, status: 503 })
      }),
    )
    await expect(writeSprintData(FAKE_URL, 'S', { _CAT: 'TASK-001' }, { _CAT: 4 }, TOKEN)).rejects.toThrow(
      'range fetch failed',
    )
  })

  it('calculates cell address from multi-digit start row', async () => {
    const patchUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') {
          patchUrls.push(url)
          return Promise.resolve({ ok: true })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ values: [['TASK-001', 0, 'desc']], address: 'Sprint!A10:C20' }),
        })
      }),
    )
    await writeSprintData(FAKE_URL, 'Sprint', { _CAT: 'TASK-001' }, { _CAT: 4 }, TOKEN)
    expect(patchUrls).toHaveLength(1)
    expect(patchUrls[0]).toContain('B10')
  })

  it('throws when a PATCH request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') return Promise.resolve({ ok: false, status: 400 })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ values: [['TASK-001', 0, 'desc']], address: 'S!A1:C1' }),
        })
      }),
    )
    await expect(writeSprintData(FAKE_URL, 'S', { _CAT: 'TASK-001' }, { _CAT: 4 }, TOKEN)).rejects.toThrow(
      'PATCH B1 failed',
    )
  })

  it('writes 0 for categories absent from hoursPerCategory', async () => {
    const writtenBodies: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') {
          if (typeof opts.body === 'string') writtenBodies.push(JSON.parse(opts.body))
          return Promise.resolve({ ok: true })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ values: [['TASK-001', 0, 'desc']], address: 'S!A1:C1' }),
        })
      }),
    )
    await writeSprintData(FAKE_URL, 'S', { _CAT: 'TASK-001' }, {}, TOKEN)
    expect(writtenBodies[0]).toEqual({ values: [[0]] })
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
          json: () =>
            Promise.resolve({
              values: [['TASK-001', 0, 'On Leave']],
              address: 'Sprint 1!A1:C1',
            }),
        })
      }),
    )

    // _OTHER maps to TASK-999 which is not in the sheet
    await writeSprintData(
      FAKE_URL,
      'Sprint 1',
      { _LEAVE: 'TASK-001', _OTHER: 'TASK-999' },
      { _LEAVE: 5, _OTHER: 3 },
      TOKEN,
    )
    expect(patchCalls).toHaveLength(1)
  })
})
