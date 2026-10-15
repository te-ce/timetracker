// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { GraphApiWorkbookService } from './workbookService'

const SP_URL = 'https://company.sharepoint.com/workbook.xlsx'

function stubFetchOk(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('GraphApiWorkbookService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves a fresh token for every call', async () => {
    const fetchMock = stubFetchOk({ value: [{ name: 'Sheet1' }] })
    let n = 0
    const svc = new GraphApiWorkbookService(SP_URL, () => Promise.resolve(`token-${++n}`))

    await svc.listSheets()
    await svc.listSheets()

    const auth = fetchMock.mock.calls.map(([, opts]) => (opts as { headers: { Authorization: string } }).headers)
    expect(auth).toEqual([{ Authorization: 'Bearer token-1' }, { Authorization: 'Bearer token-2' }])
  })

  it('propagates token failures without calling Graph', async () => {
    const fetchMock = stubFetchOk({ value: [] })
    const svc = new GraphApiWorkbookService(SP_URL, () => Promise.reject(new Error('login required')))
    await expect(svc.listRows('Sheet1')).rejects.toThrow('login required')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
