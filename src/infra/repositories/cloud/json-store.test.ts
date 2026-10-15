// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { JsonCollectionStore, JsonRecordStore, JsonValueStore } from './json-store'
import { StorageConflictError, type StorageAdapter } from '../../storage/adapter'

function createMockAdapter(): StorageAdapter & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {}
  return {
    data,
    get<T>(key: string): Promise<T | null> {
      return Promise.resolve((data[key] ?? null) as T | null)
    },
    put<T>(key: string, value: T): Promise<void> {
      data[key] = value
      return Promise.resolve()
    },
    delete(key: string): Promise<void> {
      delete data[key]
      return Promise.resolve()
    },
  }
}

interface Item {
  id: string
  value: number
}

function isItem(v: unknown): Item | null {
  if (typeof v !== 'object' || v === null) return null
  if (!('id' in v) || !('value' in v)) return null
  if (typeof v.id !== 'string' || typeof v.value !== 'number') return null
  return { id: v.id, value: v.value }
}

function isString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

describe('JsonCollectionStore', () => {
  let adapter: ReturnType<typeof createMockAdapter>
  let store: JsonCollectionStore<Item>

  beforeEach(() => {
    adapter = createMockAdapter()
    store = new JsonCollectionStore(adapter, 'items.json', isItem)
  })

  it('returns empty array when no data exists', async () => {
    expect(await store.getAll()).toEqual([])
  })

  it('upserts a new item', async () => {
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    expect(await store.getAll()).toEqual([{ id: 'a', value: 1 }])
  })

  it('upserts an existing item by identity', async () => {
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    await store.upsert({ id: 'a', value: 99 }, (i) => i.id)
    expect(await store.getAll()).toEqual([{ id: 'a', value: 99 }])
  })

  it('removes an item by id', async () => {
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    await store.upsert({ id: 'b', value: 2 }, (i) => i.id)
    await store.remove('a', (i) => i.id)
    expect(await store.getAll()).toEqual([{ id: 'b', value: 2 }])
  })

  it('filters items by predicate', async () => {
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    await store.upsert({ id: 'b', value: 5 }, (i) => i.id)
    await store.upsert({ id: 'c', value: 3 }, (i) => i.id)
    expect(await store.filter((i) => i.value > 2)).toEqual([
      { id: 'b', value: 5 },
      { id: 'c', value: 3 },
    ])
  })

  it('finds a single item by predicate', async () => {
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    await store.upsert({ id: 'b', value: 5 }, (i) => i.id)
    expect(await store.find((i) => i.id === 'b')).toEqual({ id: 'b', value: 5 })
    expect(await store.find((i) => i.id === 'z')).toBeNull()
  })

  it('persists data to adapter', async () => {
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    expect(adapter.data['items.json']).toEqual([{ id: 'a', value: 1 }])
  })

  it('caches after first load', async () => {
    adapter.data['items.json'] = [{ id: 'x', value: 42 }]
    await store.getAll()
    // Mutate adapter directly — cache should not re-read
    adapter.data['items.json'] = []
    expect(await store.getAll()).toEqual([{ id: 'x', value: 42 }])
  })

  it('clearCache forces re-read from adapter on next getAll', async () => {
    adapter.data['items.json'] = [{ id: 'x', value: 42 }]
    await store.getAll()
    // Update adapter while cache is warm
    adapter.data['items.json'] = [{ id: 'x', value: 99 }]
    store.clearCache()
    expect(await store.getAll()).toEqual([{ id: 'x', value: 99 }])
  })
})

describe('JsonRecordStore', () => {
  let adapter: ReturnType<typeof createMockAdapter>
  let store: JsonRecordStore<string>

  beforeEach(() => {
    adapter = createMockAdapter()
    store = new JsonRecordStore(adapter, 'records.json', isString)
  })

  it('returns empty record when no data exists', async () => {
    expect(await store.getAll()).toEqual({})
  })

  it('sets and gets a value', async () => {
    await store.set('2026-05-01', 'Vacation')
    expect(await store.get('2026-05-01')).toBe('Vacation')
  })

  it('returns null for missing key', async () => {
    expect(await store.get('2026-05-01')).toBeNull()
  })

  it('removes a key', async () => {
    await store.set('2026-05-01', 'Vacation')
    await store.remove('2026-05-01')
    expect(await store.get('2026-05-01')).toBeNull()
  })

  it('filters by key range', async () => {
    await store.set('2026-05-01', 'A')
    await store.set('2026-05-15', 'B')
    await store.set('2026-06-01', 'C')
    const result = await store.filterByKeyRange('2026-05-01', '2026-05-31')
    expect(result).toEqual(
      new Map([
        ['2026-05-01', 'A'],
        ['2026-05-15', 'B'],
      ]),
    )
  })

  it('persists data to adapter', async () => {
    await store.set('key', 'value')
    expect(adapter.data['records.json']).toEqual({ key: 'value' })
  })

  it('caches after first load', async () => {
    adapter.data['records.json'] = { x: 'hello' }
    await store.getAll()
    adapter.data['records.json'] = {}
    expect(await store.get('x')).toBe('hello')
  })

  it('clearCache forces re-read from adapter on next get', async () => {
    adapter.data['records.json'] = { x: 'hello' }
    await store.getAll()
    adapter.data['records.json'] = { x: 'updated' }
    store.clearCache()
    expect(await store.get('x')).toBe('updated')
  })
})

describe('JsonCollectionStore with validator', () => {
  it('accepts valid items', async () => {
    const adapter = createMockAdapter()
    adapter.data['items.json'] = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]
    const store = new JsonCollectionStore<Item>(adapter, 'items.json', isItem)
    expect(await store.getAll()).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ])
  })

  it('drops invalid items and warns', async () => {
    const adapter = createMockAdapter()
    adapter.data['items.json'] = [
      { id: 'a', value: 1 },
      { id: 'bad', value: 'not-a-number' },
      { id: 'c', value: 3 },
    ]
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new JsonCollectionStore<Item>(adapter, 'items.json', isItem)
    const result = await store.getAll()
    expect(result).toEqual([
      { id: 'a', value: 1 },
      { id: 'c', value: 3 },
    ])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid item dropped'), expect.anything())
    warnSpy.mockRestore()
  })

  it('returns empty array and warns when stored data is not an array', async () => {
    const adapter = createMockAdapter()
    adapter.data['items.json'] = { wrong: 'type' }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new JsonCollectionStore<Item>(adapter, 'items.json', isItem)
    expect(await store.getAll()).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('expected array'), expect.anything())
    warnSpy.mockRestore()
  })
})

describe('JsonRecordStore with validator', () => {
  it('accepts valid record entries', async () => {
    const adapter = createMockAdapter()
    adapter.data['records.json'] = { a: 'hello', b: 'world' }
    const store = new JsonRecordStore<string>(adapter, 'records.json', isString)
    expect(await store.getAll()).toEqual({ a: 'hello', b: 'world' })
  })

  it('drops invalid record entries and warns', async () => {
    const adapter = createMockAdapter()
    adapter.data['records.json'] = { a: 'hello', b: 42, c: 'valid' }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new JsonRecordStore<string>(adapter, 'records.json', isString)
    expect(await store.getAll()).toEqual({ a: 'hello', c: 'valid' })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid record for key "b" dropped'),
      expect.anything(),
    )
    warnSpy.mockRestore()
  })

  it('returns empty record and warns when stored data is not an object', async () => {
    const adapter = createMockAdapter()
    adapter.data['records.json'] = [1, 2, 3]
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = new JsonRecordStore<string>(adapter, 'records.json', isString)
    expect(await store.getAll()).toEqual({})
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('expected object'), expect.anything())
    warnSpy.mockRestore()
  })
})

/**
 * Adapter with eTag-like versions (like OneDriveStorageAdapter): a write over
 * a key that changed since this adapter instance last read it throws
 * StorageConflictError. Writes can be delayed or made to fail.
 */
class VersionedAdapter implements StorageAdapter {
  private files = new Map<string, { json: string; version: number }>()
  private seen = new Map<string, number>()
  putDelaysMs: number[] = []
  failNextPut = false

  /** Another device writes the key. */
  writeRemote(key: string, value: unknown): void {
    const version = (this.files.get(key)?.version ?? 0) + 1
    this.files.set(key, { json: JSON.stringify(value), version })
  }

  stored(key: string): unknown {
    const file = this.files.get(key)
    return file ? JSON.parse(file.json) : null
  }

  get<T>(key: string): Promise<T | null> {
    const file = this.files.get(key)
    this.seen.set(key, file?.version ?? 0)
    return Promise.resolve(file ? (JSON.parse(file.json) as T) : null)
  }

  async put<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value)
    await new Promise((resolve) => setTimeout(resolve, this.putDelaysMs.shift() ?? 0))
    if (this.failNextPut) {
      this.failNextPut = false
      throw new Error('network')
    }
    const current = this.files.get(key)?.version ?? 0
    if (this.seen.has(key) && this.seen.get(key) !== current) throw new StorageConflictError(key)
    this.files.set(key, { json, version: current + 1 })
    this.seen.set(key, current + 1)
  }

  delete(key: string): Promise<void> {
    this.files.delete(key)
    this.seen.set(key, 0)
    return Promise.resolve()
  }
}

function isNumber(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

describe('JsonRecordStore write ordering, failures and conflicts', () => {
  it('serializes concurrent read-modify-write updates so none is lost', async () => {
    const adapter = new VersionedAdapter()
    adapter.putDelaysMs = [5, 1, 4, 0, 2]
    const store = new JsonRecordStore<number>(adapter, 'n.json', isNumber)
    await Promise.all(Array.from({ length: 5 }, () => store.update('count', (n) => (n ?? 0) + 1)))
    expect(await store.get('count')).toBe(5)
    expect(adapter.stored('n.json')).toEqual({ count: 5 })
  })

  it('persists writes in call order even when an earlier PUT is slower', async () => {
    const adapter = new VersionedAdapter()
    adapter.putDelaysMs = [20, 0]
    const store = new JsonRecordStore<string>(adapter, 'r.json', isString)
    await Promise.all([store.set('a', 'first'), store.set('a', 'second')])
    expect(adapter.stored('r.json')).toEqual({ a: 'second' })
  })

  it('leaves the cache untouched when the write fails', async () => {
    const adapter = new VersionedAdapter()
    adapter.writeRemote('r.json', { a: 'kept' })
    const store = new JsonRecordStore<string>(adapter, 'r.json', isString)
    adapter.failNextPut = true
    await expect(store.set('b', 'lost')).rejects.toThrow('network')
    expect(await store.getAll()).toEqual({ a: 'kept' })
  })

  it('re-reads and re-applies the change when another device wrote in between', async () => {
    const adapter = new VersionedAdapter()
    adapter.writeRemote('r.json', { a: 'one' })
    const store = new JsonRecordStore<string>(adapter, 'r.json', isString)
    await store.getAll()
    adapter.writeRemote('r.json', { a: 'one', b: 'other device' })

    await store.set('c', 'mine')

    expect(adapter.stored('r.json')).toEqual({ a: 'one', b: 'other device', c: 'mine' })
    expect(await store.getAll()).toEqual({ a: 'one', b: 'other device', c: 'mine' })
  })

  it('mutate writes several records in a single PUT', async () => {
    const adapter = new VersionedAdapter()
    const putSpy = vi.spyOn(adapter, 'put')
    const store = new JsonRecordStore<string>(adapter, 'r.json', isString)
    await store.mutate((current) => ({ ...current, a: '1', b: '2' }))
    expect(putSpy).toHaveBeenCalledOnce()
    expect(adapter.stored('r.json')).toEqual({ a: '1', b: '2' })
  })
})

describe('JsonCollectionStore write failures and conflicts', () => {
  it('leaves the cache untouched when the write fails', async () => {
    const adapter = new VersionedAdapter()
    const store = new JsonCollectionStore<Item>(adapter, 'items.json', isItem)
    await store.upsert({ id: 'a', value: 1 }, (i) => i.id)
    adapter.failNextPut = true
    await expect(store.upsert({ id: 'a', value: 2 }, (i) => i.id)).rejects.toThrow('network')
    expect(await store.getAll()).toEqual([{ id: 'a', value: 1 }])
  })

  it('re-reads and re-applies the change when another device wrote in between', async () => {
    const adapter = new VersionedAdapter()
    const store = new JsonCollectionStore<Item>(adapter, 'items.json', isItem)
    await store.getAll()
    adapter.writeRemote('items.json', [{ id: 'remote', value: 1 }])
    await store.upsert({ id: 'mine', value: 2 }, (i) => i.id)
    expect(adapter.stored('items.json')).toEqual([
      { id: 'remote', value: 1 },
      { id: 'mine', value: 2 },
    ])
  })
})

describe('JsonValueStore write failures', () => {
  it('leaves the cache untouched when the write fails', async () => {
    const adapter = new VersionedAdapter()
    const store = new JsonValueStore<string>(adapter, 'v.json', isString, 'default')
    adapter.failNextPut = true
    await expect(store.set('new')).rejects.toThrow('network')
    expect(await store.get()).toBe('default')
  })
})
