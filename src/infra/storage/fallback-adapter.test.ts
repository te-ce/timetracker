// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { FallbackStorageAdapter } from './fallback-adapter'
import { InMemoryStorageAdapter } from './in-memory-adapter'
import type { StorageAdapter } from './adapter'

class SwitchableAdapter extends InMemoryStorageAdapter {
  online = true

  private check(): void {
    if (!this.online) throw new Error('network')
  }

  override get<T>(key: string): Promise<T | null> {
    this.check()
    return super.get<T>(key)
  }

  override put<T>(key: string, data: T): Promise<void> {
    this.check()
    return super.put(key, data)
  }

  override delete(key: string): Promise<void> {
    this.check()
    return super.delete(key)
  }
}

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
    const primary: StorageAdapter = {
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

  it('keeps a failed primary write as pending and serves it instead of the stale primary copy', async () => {
    const primary = new SwitchableAdapter()
    const fallback = new InMemoryStorageAdapter()
    await primary.put('key', { value: 'stale' })
    const adapter = new FallbackStorageAdapter(primary, fallback)

    primary.online = false
    await adapter.put('key', { value: 'offline edit' })
    expect(await fallback.get('key')).toEqual({ value: 'offline edit' })
    expect(adapter.pendingCount()).toBe(1)

    primary.online = true
    expect(await adapter.get('key')).toEqual({ value: 'offline edit' })
    expect(await primary.get('key')).toEqual({ value: 'offline edit' })
    expect(adapter.pendingCount()).toBe(0)
  })

  it('reports pending-count changes and flushes all pending keys on demand', async () => {
    const primary = new SwitchableAdapter()
    const counts: number[] = []
    const adapter = new FallbackStorageAdapter(primary, new InMemoryStorageAdapter(), (n) => counts.push(n))

    primary.online = false
    await adapter.put('a', 1)
    await adapter.put('b', 2)
    expect(counts.at(-1)).toBe(2)

    primary.online = true
    await adapter.flush()
    expect(await primary.get('a')).toBe(1)
    expect(await primary.get('b')).toBe(2)
    expect(counts.at(-1)).toBe(0)
  })

  it('remembers pending keys across adapter instances (app restart)', async () => {
    const primary = new SwitchableAdapter()
    const fallback = new InMemoryStorageAdapter()
    await primary.put('key', 'stale')
    primary.online = false
    await new FallbackStorageAdapter(primary, fallback).put('key', 'offline edit')

    primary.online = true
    const restarted = new FallbackStorageAdapter(primary, fallback)
    expect(await restarted.get('key')).toBe('offline edit')
    expect(await primary.get('key')).toBe('offline edit')
  })

  it('replays an offline delete instead of resurrecting the primary copy', async () => {
    const primary = new SwitchableAdapter()
    const fallback = new InMemoryStorageAdapter()
    await primary.put('key', 'data')
    const adapter = new FallbackStorageAdapter(primary, fallback)

    primary.online = false
    await adapter.delete('key')
    primary.online = true

    expect(await adapter.get('key')).toBeNull()
    expect(await primary.get('key')).toBeNull()
  })

  it('treats a missing primary file as deleted and drops the stale local copy', async () => {
    const primary = new InMemoryStorageAdapter()
    const fallback = new InMemoryStorageAdapter()
    await fallback.put('key', { source: 'deleted on another device' })

    const adapter = new FallbackStorageAdapter(primary, fallback)
    expect(await adapter.get('key')).toBeNull()
    expect(await fallback.get('key')).toBeNull()
  })

  it('mirrors a successful primary read into the fallback for offline use', async () => {
    const primary = new SwitchableAdapter()
    const fallback = new InMemoryStorageAdapter()
    await primary.put('key', 'remote')
    const adapter = new FallbackStorageAdapter(primary, fallback)
    await adapter.get('key')

    primary.online = false
    expect(await adapter.get('key')).toBe('remote')
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

  it('still deletes from fallback when primary delete fails and keeps the delete pending', async () => {
    const primary: StorageAdapter = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockRejectedValue(new Error('network')),
    }
    const fallback = new InMemoryStorageAdapter()
    await fallback.put('key', 'data')

    const adapter = new FallbackStorageAdapter(primary, fallback)
    await adapter.delete('key')

    expect(await fallback.get('key')).toBeNull()
    expect(adapter.pendingCount()).toBe(1)
  })

  it('returns null when both primary and fallback have no data', async () => {
    const primary = new InMemoryStorageAdapter()
    const fallback = new InMemoryStorageAdapter()

    const adapter = new FallbackStorageAdapter(primary, fallback)
    expect(await adapter.get('missing')).toBeNull()
  })
})
