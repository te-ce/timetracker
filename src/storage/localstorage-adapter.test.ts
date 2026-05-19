import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageAdapter } from './localstorage-adapter'

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null for missing key', async () => {
    const adapter = new LocalStorageAdapter()
    expect(await adapter.get('missing')).toBeNull()
  })

  it('stores and retrieves JSON data', async () => {
    const adapter = new LocalStorageAdapter()
    await adapter.put('config', { name: 'test', value: 42 })
    const result = await adapter.get<{ name: string; value: number }>('config')
    expect(result).toEqual({ name: 'test', value: 42 })
  })

  it('uses prefix to namespace keys', async () => {
    const adapter = new LocalStorageAdapter('tt_')
    await adapter.put('data', [1, 2, 3])
    expect(localStorage.getItem('tt_data')).toBe('[1,2,3]')
  })

  it('deletes stored data', async () => {
    const adapter = new LocalStorageAdapter()
    await adapter.put('key', 'value')
    await adapter.delete('key')
    expect(await adapter.get('key')).toBeNull()
  })

  it('handles complex nested objects', async () => {
    const adapter = new LocalStorageAdapter()
    const data = { entries: [{ id: '1', date: '2026-05-19', hours: 8 }] }
    await adapter.put('entries', data)
    expect(await adapter.get('entries')).toEqual(data)
  })
})
