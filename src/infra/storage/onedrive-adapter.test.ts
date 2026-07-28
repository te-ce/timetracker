// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OneDriveStorageAdapter } from './onedrive-adapter'

function makeToken(token = 'test-token'): () => Promise<string> {
  return () => Promise.resolve(token)
}

function mockFetch(status: number, body: unknown = null) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      statusText: `Status ${status}`,
    }),
  )
}

function isPlainHeaders(h: HeadersInit | undefined): h is Record<string, string> {
  return typeof h === 'object' && !Array.isArray(h) && !(h instanceof Headers)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('OneDriveStorageAdapter', () => {
  describe('get', () => {
    it('returns parsed JSON on 200', async () => {
      const payload = { theme: 'dark' }
      globalThis.fetch = mockFetch(200, payload)
      const adapter = new OneDriveStorageAdapter(makeToken())
      expect(await adapter.get<typeof payload>('config')).toEqual(payload)
    })

    it('returns null on 404', async () => {
      globalThis.fetch = mockFetch(404)
      const adapter = new OneDriveStorageAdapter(makeToken())
      expect(await adapter.get('missing')).toBeNull()
    })

    it('throws on non-ok non-404 status', async () => {
      globalThis.fetch = mockFetch(500)
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.get('config')).rejects.toThrow('OneDrive GET failed: 500')
    })

    it('sends Authorization header with token', async () => {
      const fetchSpy = mockFetch(200, {})
      globalThis.fetch = fetchSpy
      const adapter = new OneDriveStorageAdapter(makeToken('my-secret'))
      await adapter.get('config')
      const [, opts] = fetchSpy.mock.calls[0] ?? []
      if (!isPlainHeaders(opts?.headers)) throw new Error('expected plain headers object')
      expect(opts.headers['Authorization']).toBe('Bearer my-secret')
    })

    it('calls the correct OneDrive URL', async () => {
      const fetchSpy = mockFetch(200, {})
      globalThis.fetch = fetchSpy
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.get('my-key')
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/drive/special/approot:/my-key:/content',
        expect.any(Object),
      )
    })
  })

  describe('put', () => {
    it('sends PUT request with JSON body', async () => {
      const fetchSpy = mockFetch(200)
      globalThis.fetch = fetchSpy
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.put('config', { theme: 'dark' })
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('config'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ theme: 'dark' }),
        }),
      )
    })

    it('throws on non-ok response', async () => {
      globalThis.fetch = mockFetch(403)
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.put('config', {})).rejects.toThrow('OneDrive PUT failed: 403')
    })

    it('sends Authorization header on put', async () => {
      const fetchSpy = mockFetch(200)
      globalThis.fetch = fetchSpy
      const adapter = new OneDriveStorageAdapter(makeToken('tok'))
      await adapter.put('x', {})
      const [, opts] = fetchSpy.mock.calls[0] ?? []
      if (!isPlainHeaders(opts?.headers)) throw new Error('expected plain headers object')
      expect(opts.headers['Authorization']).toBe('Bearer tok')
    })
  })

  describe('delete', () => {
    it('sends DELETE request to correct URL', async () => {
      const fetchSpy = mockFetch(204)
      globalThis.fetch = fetchSpy
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.delete('config')
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/drive/special/approot:/config:',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('silently ignores 404 on delete', async () => {
      globalThis.fetch = mockFetch(404)
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.delete('gone')).resolves.toBeUndefined()
    })

    it('throws on non-ok non-404 delete response', async () => {
      globalThis.fetch = mockFetch(500)
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.delete('config')).rejects.toThrow('OneDrive DELETE failed: 500')
    })
  })
})
