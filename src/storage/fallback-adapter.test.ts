import { describe, it, expect, vi } from 'vitest'
import { FallbackStorageAdapter } from './fallback-adapter'
import { InMemoryStorageAdapter } from './in-memory-adapter'

describe('FallbackStorageAdapter', () => {
  it('reads from primary when available', async () => {
    const primary = new InMemoryStorageAdapter()
    const fallback = new InMemoryStorageAdapter()
    await primary.put('key', { source: 'primary' })
    await fallback.put('key', { source: 'fallback' })

    const adapter = new FallbackStorageAdapter(primary, fallback)
    expect(await adapter.get('key')).toEqual({ source: 'primary' })
  })

  it('falls back to secondary when primary throws', async () => {
    const primary: any = {
      get: vi.fn().mockRejectedValue(new Error('network')),
      put: vi.fn().mockRejectedValue(new Error('network')),
      delete: vi.fn().mockRejectedValue(new Error('network')),
    }
    const fallback = new InMemoryStorageAdapter()
    await fallback.put('key', { source: 'fallback' })

    const adapter = new FallbackStorageAdapter(primary, fallback)
    expect(await adapter.get('key')).toEqual({ source: 'fallback' })
  })

  it('writes to both primary and fallback', async () => {
    const primary = new InMemoryStorageAdapter()
    const fallback = new InMemoryStorageAdapter()

    const adapter = new FallbackStorageAdapter(primary, fallback)
    await adapter.put('key', { value: 42 })

    expect(await primary.get('key')).toEqual({ value: 42 })
    expect(await fallback.get('key')).toEqual({ value: 42 })
  })

  it('still writes to fallback when primary write fails', async () => {
    const primary: any = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockRejectedValue(new Error('network')),
      delete: vi.fn().mockRejectedValue(new Error('network')),
    }
    const fallback = new InMemoryStorageAdapter()

    const adapter = new FallbackStorageAdapter(primary, fallback)
    await adapter.put('key', { value: 42 })

    expect(await fallback.get('key')).toEqual({ value: 42 })
  })

  it('deletes from both primary and fallback', async () => {
    const primary = new InMemoryStorageAdapter()
    const fallback = new InMemoryStorageAdapter()
    await primary.put('key', 'data')
    await fallback.put('key', 'data')

    const adapter = new FallbackStorageAdapter(primary, fallback)
    await adapter.delete('key')

    expect(await primary.get('key')).toBeNull()
    expect(await fallback.get('key')).toBeNull()
  })

  it('still deletes from fallback when primary delete fails', async () => {
    const primary: any = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockRejectedValue(new Error('network')),
    }
    const fallback = new InMemoryStorageAdapter()
    await fallback.put('key', 'data')

    const adapter = new FallbackStorageAdapter(primary, fallback)
    await adapter.delete('key')

    expect(await fallback.get('key')).toBeNull()
  })

  it('returns null when both primary and fallback have no data', async () => {
    const primary = new InMemoryStorageAdapter()
    const fallback = new InMemoryStorageAdapter()

    const adapter = new FallbackStorageAdapter(primary, fallback)
    expect(await adapter.get('missing')).toBeNull()
  })
})
