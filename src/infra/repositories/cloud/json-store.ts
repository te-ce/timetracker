import type { StorageAdapter } from '../../storage/adapter'

type Validator<T> = (v: unknown) => T | null

export class JsonCollectionStore<T> {
  private adapter: StorageAdapter
  private key: string
  private validate: Validator<T> | undefined
  private cache: T[] | null = null

  constructor(adapter: StorageAdapter, key: string, validate?: Validator<T>) {
    this.adapter = adapter
    this.key = key
    this.validate = validate
  }

  async getAll(): Promise<T[]> {
    if (this.cache) return this.cache
    const raw: unknown = (await this.adapter.get<unknown>(this.key)) ?? []
    if (!this.validate) {
      const data: unknown = raw
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.cache = data as T[]
      return this.cache
    }
    if (!Array.isArray(raw)) {
      console.warn(`[JsonCollectionStore] ${this.key}: expected array, got`, typeof raw)
      this.cache = []
      return this.cache
    }
    const valid: T[] = []
    for (const item of raw) {
      const result = this.validate(item)
      if (result !== null) {
        valid.push(result)
      } else {
        console.warn(`[JsonCollectionStore] ${this.key}: invalid item dropped`, item)
      }
    }
    this.cache = valid
    return this.cache
  }

  clearCache(): void {
    this.cache = null
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

export class JsonRecordStore<V> {
  private adapter: StorageAdapter
  private key: string
  private validate: Validator<V> | undefined
  private cache: Record<string, V> | null = null

  constructor(adapter: StorageAdapter, key: string, validate?: Validator<V>) {
    this.adapter = adapter
    this.key = key
    this.validate = validate
  }

  async getAll(): Promise<Record<string, V>> {
    if (this.cache) return this.cache
    const raw: unknown = (await this.adapter.get<unknown>(this.key)) ?? {}
    if (!this.validate) {
      const data: unknown = raw
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.cache = data as Record<string, V>
      return this.cache
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      console.warn(`[JsonRecordStore] ${this.key}: expected object, got`, typeof raw)
      this.cache = {}
      return this.cache
    }
    const validated: Record<string, V> = {}
    for (const [k, v] of Object.entries(raw)) {
      const result = this.validate(v)
      if (result !== null) {
        validated[k] = result
      } else {
        console.warn(`[JsonRecordStore] ${this.key}: invalid record for key "${k}" dropped`, v)
      }
    }
    this.cache = validated
    return this.cache
  }

  clearCache(): void {
    this.cache = null
  }

  async set(recordKey: string, value: V): Promise<void> {
    const store = await this.getAll()
    this.cache = { ...store, [recordKey]: value }
    await this.persist()
  }

  async get(recordKey: string): Promise<V | null> {
    const store = await this.getAll()
    return store[recordKey] ?? null
  }

  async remove(recordKey: string): Promise<void> {
    const store = await this.getAll()
    const updated: Record<string, V> = {}
    for (const [k, v] of Object.entries(store)) {
      if (k !== recordKey) updated[k] = v
    }
    this.cache = updated
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
