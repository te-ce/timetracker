import type { StorageAdapter } from '../../storage/adapter'

/**
 * Generic cached collection store for array-shaped JSON blobs.
 * Handles load/cache/persist and provides upsert, remove, and filter.
 */
export class JsonCollectionStore<T> {
  private adapter: StorageAdapter
  private key: string
  private cache: T[] | null = null

  constructor(adapter: StorageAdapter, key: string) {
    this.adapter = adapter
    this.key = key
  }

  async getAll(): Promise<T[]> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<T[]>(this.key)) ?? []
    return this.cache
  }

  async upsert(item: T, idFn: (item: T) => unknown): Promise<void> {
    const items = await this.getAll()
    const id = idFn(item)
    const idx = items.findIndex((existing) => idFn(existing) === id)
    if (idx >= 0) items[idx] = item
    else items.push(item)
    await this.persist()
  }

  async remove(id: unknown, idFn: (item: T) => unknown): Promise<void> {
    const items = await this.getAll()
    this.cache = items.filter((item) => idFn(item) !== id)
    await this.persist()
  }

  async filter(predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.getAll()
    return items.filter(predicate)
  }

  async find(predicate: (item: T) => boolean): Promise<T | null> {
    const items = await this.getAll()
    return items.find(predicate) ?? null
  }

  private async persist(): Promise<void> {
    await this.adapter.put(this.key, this.cache)
  }
}

/**
 * Generic cached record store for key-value shaped JSON blobs.
 * Handles load/cache/persist and provides set, get, remove, and filterByKeyRange.
 */
export class JsonRecordStore<V> {
  private adapter: StorageAdapter
  private key: string
  private cache: Record<string, V> | null = null

  constructor(adapter: StorageAdapter, key: string) {
    this.adapter = adapter
    this.key = key
  }

  async getAll(): Promise<Record<string, V>> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<Record<string, V>>(this.key)) ?? {}
    return this.cache
  }

  async set(recordKey: string, value: V): Promise<void> {
    const store = await this.getAll()
    store[recordKey] = value
    await this.persist()
  }

  async get(recordKey: string): Promise<V | null> {
    const store = await this.getAll()
    return store[recordKey] ?? null
  }

  async remove(recordKey: string): Promise<void> {
    const store = await this.getAll()
    delete store[recordKey]
    await this.persist()
  }

  async filterByKeyRange(from: string, to: string): Promise<Map<string, V>> {
    const store = await this.getAll()
    const result = new Map<string, V>()
    for (const [key, value] of Object.entries(store)) {
      if (key >= from && key <= to) {
        result.set(key, value)
      }
    }
    return result
  }

  private async persist(): Promise<void> {
    await this.adapter.put(this.key, this.cache)
  }
}
