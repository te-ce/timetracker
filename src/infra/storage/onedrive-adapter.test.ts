// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OneDriveStorageAdapter } from './onedrive-adapter'
import { StorageConflictError } from './adapter'

const APPROOT = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:'

function makeToken(token = 'test-token'): () => Promise<string> {
  return () => Promise.resolve(token)
}

interface Call {
  url: string
  method: string
  headers: Record<string, string>
}

/** Minimal in-memory stand-in for the Graph app-folder endpoints, with eTags. */
class FakeGraph {
  files = new Map<string, { body: string; version: number }>()
  calls: Call[] = []
  failWith: number | null = null

  write(key: string, data: unknown): void {
    const version = (this.files.get(key)?.version ?? 0) + 1
    this.files.set(key, { body: JSON.stringify(data), version })
  }

  private etag(key: string): string {
    return `"{ID},${this.files.get(key)?.version ?? 0}"`
  }

  fetch = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init.method ?? 'GET'
    const headers =
      init.headers && !(init.headers instanceof Headers) && !Array.isArray(init.headers) ? init.headers : {}
    this.calls.push({ url, method, headers })
    if (this.failWith !== null) return Promise.resolve(new Response(null, { status: this.failWith }))
    return Promise.resolve(this.route(url, method, headers, init.body))
  }

  private download(url: string): Response {
    const file = this.files.get(url.slice('https://download/'.length))
    return file ? new Response(file.body) : new Response(null, { status: 404 })
  }

  private route(url: string, method: string, headers: Record<string, string>, body: unknown): Response {
    if (url.startsWith('https://download/')) return this.download(url)
    const path = url.slice(APPROOT.length + 1)
    const key = path.replace(/:(\/content)?(\?.*)?$/, '')
    const file = this.files.get(key)
    const ifMatch = headers['If-Match']
    if (ifMatch && ifMatch !== this.etag(key)) return new Response(null, { status: 412 })
    if (method === 'GET') {
      if (!file) return new Response(null, { status: 404 })
      return Response.json({ eTag: this.etag(key), '@microsoft.graph.downloadUrl': `https://download/${key}` })
    }
    if (method === 'PUT') {
      if (file && url.includes('conflictBehavior=fail')) return new Response(null, { status: 409 })
      this.write(key, JSON.parse(String(body)))
      return Response.json({ eTag: this.etag(key) })
    }
    if (!file) return new Response(null, { status: 404 })
    this.files.delete(key)
    return new Response(null, { status: 204 })
  }
}

let graph: FakeGraph
const realFetch = globalThis.fetch

beforeEach(() => {
  graph = new FakeGraph()
  globalThis.fetch = graph.fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('OneDriveStorageAdapter', () => {
  describe('get', () => {
    it('returns parsed JSON from the item download URL', async () => {
      graph.write('config.json', { theme: 'dark' })
      const adapter = new OneDriveStorageAdapter(makeToken())
      expect(await adapter.get('config.json')).toEqual({ theme: 'dark' })
      expect(graph.calls.map((c) => c.url)).toEqual([`${APPROOT}/config.json`, 'https://download/config.json'])
    })

    it('returns null on 404', async () => {
      const adapter = new OneDriveStorageAdapter(makeToken())
      expect(await adapter.get('missing')).toBeNull()
    })

    it('throws on non-ok non-404 status', async () => {
      graph.failWith = 500
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.get('config')).rejects.toThrow('OneDrive GET failed: 500')
    })

    it('sends Authorization header with token', async () => {
      const adapter = new OneDriveStorageAdapter(makeToken('my-secret'))
      await adapter.get('config')
      expect(graph.calls[0]?.headers['Authorization']).toBe('Bearer my-secret')
    })
  })

  describe('put', () => {
    it('sends PUT request with JSON body', async () => {
      const adapter = new OneDriveStorageAdapter(makeToken('tok'))
      await adapter.put('config', { theme: 'dark' })
      expect(graph.calls[0]).toMatchObject({ url: `${APPROOT}/config:/content`, method: 'PUT' })
      expect(graph.calls[0]?.headers['Authorization']).toBe('Bearer tok')
      expect(graph.files.get('config')?.body).toBe(JSON.stringify({ theme: 'dark' }))
    })

    it('throws on non-ok response', async () => {
      graph.failWith = 403
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.put('config', {})).rejects.toThrow('OneDrive PUT failed: 403')
    })

    it('sends the eTag of the last read version as If-Match', async () => {
      graph.write('k', 1)
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.get('k')
      await adapter.put('k', 2)
      expect(graph.calls.at(-1)?.headers['If-Match']).toBe('"{ID},1"')
      await adapter.put('k', 3)
      expect(graph.calls.at(-1)?.headers['If-Match']).toBe('"{ID},2"')
    })

    it('throws StorageConflictError when another device changed the file since it was read', async () => {
      graph.write('k', 'mine')
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.get('k')
      graph.write('k', 'other device')

      await expect(adapter.put('k', 'overwrite')).rejects.toBeInstanceOf(StorageConflictError)
      expect(graph.files.get('k')?.body).toBe('"other device"')

      expect(await adapter.get('k')).toBe('other device')
      await adapter.put('k', 'merged')
      expect(graph.files.get('k')?.body).toBe('"merged"')
    })

    it('throws StorageConflictError when a file seen as missing was created elsewhere', async () => {
      const adapter = new OneDriveStorageAdapter(makeToken())
      expect(await adapter.get('k')).toBeNull()
      graph.write('k', 'other device')
      await expect(adapter.put('k', 'mine')).rejects.toBeInstanceOf(StorageConflictError)
    })
  })

  describe('delete', () => {
    it('sends DELETE request to correct URL', async () => {
      graph.write('config', {})
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.delete('config')
      expect(graph.calls[0]).toMatchObject({ url: `${APPROOT}/config:`, method: 'DELETE' })
      expect(graph.files.has('config')).toBe(false)
    })

    it('silently ignores 404 on delete', async () => {
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.delete('gone')).resolves.toBeUndefined()
    })

    it('throws on non-ok non-404 delete response', async () => {
      graph.failWith = 500
      const adapter = new OneDriveStorageAdapter(makeToken())
      await expect(adapter.delete('config')).rejects.toThrow('OneDrive DELETE failed: 500')
    })

    it('throws StorageConflictError when deleting a file changed since it was read', async () => {
      graph.write('k', 1)
      const adapter = new OneDriveStorageAdapter(makeToken())
      await adapter.get('k')
      graph.write('k', 2)
      await expect(adapter.delete('k')).rejects.toBeInstanceOf(StorageConflictError)
      expect(graph.files.has('k')).toBe(true)
    })
  })
})
