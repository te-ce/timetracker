// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { JsonCollectionStore, JsonRecordStore } from './json-store'
import type { StorageAdapter } from '../../storage/adapter'

function createMockAdapter(): StorageAdapter & { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {}
  return {
    data,
    get<T>(key: string): Promise<T | null> {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

describe('JsonCollectionStore', () => {
  let adapter: ReturnType<typeof createMockAdapter>
  let store: JsonCollectionStore<Item>

  beforeEach(() => {
    adapter = createMockAdapter()
    store = new JsonCollectionStore(adapter, 'items.json')
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
    store = new JsonRecordStore(adapter, 'records.json')
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
  function isItem(v: unknown): Item | null {
    if (typeof v !== 'object' || v === null) return null
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const o = v as Record<string, unknown>
    if (typeof o['id'] !== 'string' || typeof o['value'] !== 'number') return null
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { id: o['id'] as string, value: o['value'] as number }
  }

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
  function isString(v: unknown): string | null {
    return typeof v === 'string' ? v : null
  }

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
