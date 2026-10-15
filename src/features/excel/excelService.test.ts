// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  encodeSharesUrl,
  listSheets,
  listRows,
  writeSprintData,
  archiveSprintData,
  SheetExistsError,
} from './excelService'

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
      { taskId: 'TASK-001', description: 'On Leave', rowNumber: 1 },
      { taskId: 'TASK-002', description: 'Training', rowNumber: 2 },
    ])
  })

  it('keeps real row numbers when blank rows are skipped', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            address: 'Sprint 1!A5:C8',
            values: [
              ['T-1', 0, 'a'],
              ['', 0, ''],
              ['T-3', 0, 'c'],
              [null, 0, ''],
            ],
          }),
      }),
    )
    const rows = await listRows(FAKE_URL, 'Sprint 1', TOKEN)
    expect(rows.map((r) => [r.taskId, r.rowNumber])).toEqual([
      ['T-1', 5],
      ['T-3', 7],
    ])
  })

  it('accepts numeric task IDs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            address: 'S!A1:C2',
            values: [
              [12345, 0, 'num'],
              ['T-2', 0, 'str'],
            ],
          }),
      }),
    )
    const rows = await listRows(FAKE_URL, 'S', TOKEN)
    expect(rows.map((r) => r.taskId)).toEqual(['12345', 'T-2'])
  })

  it('parses quoted sheet names and single-cell addresses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ address: "'My Sheet'!A7", values: [['T-1', 0, 'x']] }),
      }),
    )
    const rows = await listRows(FAKE_URL, 'My Sheet', TOKEN)
    expect(rows[0]?.rowNumber).toBe(7)
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

  it('throws when the used range fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' }))
    await expect(writeSprintData(FAKE_URL, 'S', { _CAT: 'TASK-001' }, { _CAT: 4 }, TOKEN)).rejects.toThrow(
      'range fetch failed',
    )
  })

  it('fetches the used range once', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'PATCH') return Promise.resolve({ ok: true })
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ values: [['TASK-001', 0, 'd']], address: 'S!A1:C1' }),
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    await writeSprintData(FAKE_URL, 'S', { _CAT: 'TASK-001' }, { _CAT: 4 }, TOKEN)
    const gets = fetchMock.mock.calls.filter(([, opts]) => (opts as RequestInit | undefined)?.method !== 'PATCH')
    expect(gets).toHaveLength(1)
  })

  it('writes to the real row when a blank row precedes the task', async () => {
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
          json: () =>
            Promise.resolve({
              address: 'S!A1:C3',
              values: [
                ['TASK-001', 0, 'a'],
                ['', 0, ''],
                ['TASK-003', 0, 'c'],
              ],
            }),
        })
      }),
    )
    await writeSprintData(FAKE_URL, 'S', { _A: 'TASK-001', _C: 'TASK-003' }, { _A: 1, _C: 3 }, TOKEN)
    expect(patchUrls.some((u) => u.includes("'B3'"))).toBe(true)
    expect(patchUrls.some((u) => u.includes("'B2'"))).toBe(false)
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

interface RecordedCall {
  method: string
  url: string
  body: unknown
}

function stubGraph(handler: (call: RecordedCall) => Response): RecordedCall[] {
  const calls: RecordedCall[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const call: RecordedCall = {
        method: init?.method ?? 'GET',
        url,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      }
      calls.push(call)
      return Promise.resolve(handler(call))
    }),
  )
  return calls
}

const ok = () => new Response('{}', { status: 200 })
const status = (code: number, headers?: Record<string, string>) =>
  new Response(null, headers ? { status: code, headers } : { status: code })

describe('archiveSprintData', () => {
  const base = () => workbookBase()
  const mapping = { _A: 'T1' }
  const hours = { _A: 3 }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates and fills the sheet when it does not exist', async () => {
    const calls = stubGraph((c) => (c.method === 'GET' ? status(404) : ok()))
    await archiveSprintData(FAKE_URL, 'Archive', mapping, hours, TOKEN, false)
    expect(calls.map((c) => c.method)).toEqual(['GET', 'POST', 'PATCH'])
    expect(calls[1]?.body).toEqual({ name: 'Archive' })
    expect(calls[2]?.body).toEqual({ values: [['T1', 3]] })
  })

  it('throws instead of treating a non-404 existence failure as absent', async () => {
    const calls = stubGraph(() => status(403))
    await expect(archiveSprintData(FAKE_URL, 'Archive', mapping, hours, TOKEN, true)).rejects.toThrow(
      'existence check failed: 403',
    )
    expect(calls).toHaveLength(1)
  })

  it('throws SheetExistsError without writing when the sheet exists and overwrite is false', async () => {
    const calls = stubGraph(() => ok())
    await expect(archiveSprintData(FAKE_URL, 'Archive', mapping, hours, TOKEN, false)).rejects.toBeInstanceOf(
      SheetExistsError,
    )
    expect(calls).toHaveLength(1)
  })

  it('writes a temp sheet, then deletes the old one and renames the temp sheet', async () => {
    const calls = stubGraph(() => ok())
    await archiveSprintData(FAKE_URL, 'Archive', mapping, hours, TOKEN, true)
    expect(calls.map((c) => c.method)).toEqual(['GET', 'POST', 'PATCH', 'DELETE', 'PATCH'])
    const created = calls[1]?.body
    const tempName = typeof created === 'object' && created !== null && 'name' in created ? String(created.name) : ''
    expect(tempName).not.toBe('Archive')
    expect(calls[3]?.url).toBe(`${base()}/worksheets/Archive`)
    expect(calls[4]?.url).toBe(`${base()}/worksheets/${encodeURIComponent(tempName)}`)
    expect(calls[4]?.body).toEqual({ name: 'Archive' })
  })

  it('keeps the old sheet when writing the new data fails', async () => {
    const calls = stubGraph((c) => (c.method === 'PATCH' ? status(500) : ok()))
    await expect(archiveSprintData(FAKE_URL, 'Archive', mapping, hours, TOKEN, true)).rejects.toThrow(
      'write failed: 500',
    )
    const deletes = calls.filter((c) => c.method === 'DELETE')
    expect(deletes).toHaveLength(1)
    expect(deletes[0]?.url).not.toBe(`${base()}/worksheets/Archive`)
  })

  it('removes the temp sheet when deleting the old sheet fails', async () => {
    const calls = stubGraph((c) => (c.method === 'DELETE' && c.url.endsWith('/Archive') ? status(500) : ok()))
    await expect(archiveSprintData(FAKE_URL, 'Archive', mapping, hours, TOKEN, true)).rejects.toThrow(
      'delete sheet failed: 500',
    )
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(2)
  })
})

describe('Graph retry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries 429 honouring Retry-After and then succeeds', async () => {
    let n = 0
    const calls = stubGraph(() =>
      ++n < 3 ? status(429, { 'Retry-After': '0' }) : new Response(JSON.stringify({ value: [{ name: 'S' }] })),
    )
    await expect(listSheets(FAKE_URL, TOKEN)).resolves.toEqual(['S'])
    expect(calls).toHaveLength(3)
  })

  it('gives up after 3 attempts and reports the status', async () => {
    const calls = stubGraph(() => status(503, { 'Retry-After': '0' }))
    await expect(listSheets(FAKE_URL, TOKEN)).rejects.toThrow('listSheets failed: 503')
    expect(calls).toHaveLength(3)
  })

  it('does not retry other errors', async () => {
    const calls = stubGraph(() => status(500))
    await expect(listSheets(FAKE_URL, TOKEN)).rejects.toThrow('listSheets failed: 500')
    expect(calls).toHaveLength(1)
  })
})
