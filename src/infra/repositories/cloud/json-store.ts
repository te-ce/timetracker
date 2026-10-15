import { StorageConflictError, type StorageAdapter } from '../../storage/adapter'

type Validator<T> = (v: unknown) => T | null

const MAX_CONFLICT_RETRIES = 3

/**
 * Runs the writes of one storage key one after another, and applies each as
 * read → mutate → put. The cache only takes the new value once the put
 * succeeded. On StorageConflictError (another device wrote the file) the cache
 * is dropped, the file re-read and the mutation re-applied. See ADR 0013.
 */
class KeyWriter<S> {
  private queue: Promise<unknown> = Promise.resolve()
  private load: () => Promise<S>
  private save: (state: S) => Promise<void>
  private invalidate: () => void

  constructor(load: () => Promise<S>, save: (state: S) => Promise<void>, invalidate: () => void) {
    this.load = load
    this.save = save
    this.invalidate = invalidate
  }

  /** Resolves with the state that was persisted. */
  write(mutation: (current: S) => S): Promise<S> {
    const run = this.queue.then(
      () => this.apply(mutation),
      () => this.apply(mutation),
    )
    this.queue = run.catch(() => undefined)
    return run
  }

  private async apply(mutation: (current: S) => S): Promise<S> {
    for (let attempt = 1; ; attempt++) {
      try {
        const next = mutation(await this.load())
        await this.save(next)
        return next
      } catch (e) {
        if (!(e instanceof StorageConflictError) || attempt >= MAX_CONFLICT_RETRIES) throw e
        this.invalidate()
      }
    }
  }
}

export class JsonCollectionStore<T> {
  private adapter: StorageAdapter
  private key: string
  private validate: Validator<T>
  private cache: T[] | null = null
  private writer: KeyWriter<T[]>

  constructor(adapter: StorageAdapter, key: string, validate: Validator<T>) {
    this.adapter = adapter
    this.key = key
    this.validate = validate
    this.writer = new KeyWriter(
      () => this.getAll(),
      async (items) => {
        await this.adapter.put(this.key, items)
        this.cache = items
      },
      () => this.clearCache(),
    )
  }

  async getAll(): Promise<T[]> {
    if (this.cache) return this.cache
    const raw: unknown = (await this.adapter.get<unknown>(this.key)) ?? []
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
    await this.writer.write((items) => {
      const id = idFn(item)
      const idx = items.findIndex((existing) => idFn(existing) === id)
      return idx >= 0 ? items.map((existing, i) => (i === idx ? item : existing)) : [...items, item]
    })
  }

  async remove(id: unknown, idFn: (item: T) => unknown): Promise<void> {
    await this.writer.write((items) => items.filter((item) => idFn(item) !== id))
  }

  async filter(predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.getAll()
    return items.filter(predicate)
  }

  async find(predicate: (item: T) => boolean): Promise<T | null> {
    const items = await this.getAll()
    return items.find(predicate) ?? null
  }
}

/** A single validated JSON object at one key — the same validate-and-cache shape as `JsonRecordStore`, but for a value rather than a keyed collection. Falls back to `defaultValue` (cloned per read) when the key is empty or fails validation. */
export class JsonValueStore<T> {
  private adapter: StorageAdapter
  private key: string
  private validate: Validator<T>
  private defaultValue: T
  private cache: T | null = null
  private writer: KeyWriter<T>

  constructor(adapter: StorageAdapter, key: string, validate: Validator<T>, defaultValue: T) {
    this.adapter = adapter
    this.key = key
    this.validate = validate
    this.defaultValue = defaultValue
    this.writer = new KeyWriter(
      () => this.get(),
      async (value) => {
        await this.adapter.put(this.key, value)
        this.cache = value
      },
      () => this.clearCache(),
    )
  }

  async get(): Promise<T> {
    if (this.cache === null) {
      const raw = await this.adapter.get<unknown>(this.key)
      if (raw === null) {
        this.cache = structuredClone(this.defaultValue)
      } else {
        const result = this.validate(raw)
        if (result === null) {
          console.warn(`[JsonValueStore] ${this.key}: stored value failed validation, using default`, raw)
          this.cache = structuredClone(this.defaultValue)
        } else {
          this.cache = result
        }
      }
    }
    return structuredClone(this.cache)
  }

  async set(value: T): Promise<void> {
    const copy = structuredClone(value)
    await this.writer.write(() => copy)
  }

  clearCache(): void {
    this.cache = null
  }
}

export class JsonRecordStore<V> {
  private adapter: StorageAdapter
  private key: string
  private validate: Validator<V>
  private cache: Record<string, V> | null = null
  private writer: KeyWriter<Record<string, V>>

  constructor(adapter: StorageAdapter, key: string, validate: Validator<V>) {
    this.adapter = adapter
    this.key = key
    this.validate = validate
    this.writer = new KeyWriter(
      () => this.getAll(),
      async (records) => {
        await this.adapter.put(this.key, records)
        this.cache = records
      },
      () => this.clearCache(),
    )
  }

  async getAll(): Promise<Record<string, V>> {
    if (this.cache) return this.cache
    const raw: unknown = (await this.adapter.get<unknown>(this.key)) ?? {}
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

  /** Applies `mutation` to the whole record in one serialized, conflict-retried write. Must return a new object. */
  mutate(mutation: (current: Record<string, V>) => Record<string, V>): Promise<Record<string, V>> {
    return this.writer.write(mutation)
  }

  async set(recordKey: string, value: V): Promise<void> {
    await this.mutate((store) => ({ ...store, [recordKey]: value }))
  }

  /** Read-modify-write of one record; returning null removes it. Resolves with the persisted record. */
  async update(recordKey: string, updater: (current: V | null) => V | null): Promise<V | null> {
    const saved = await this.mutate((store) => {
      const next = updater(store[recordKey] ?? null)
      return next === null ? withoutKey(store, recordKey) : { ...store, [recordKey]: next }
    })
    return saved[recordKey] ?? null
  }

  async get(recordKey: string): Promise<V | null> {
    const store = await this.getAll()
    return store[recordKey] ?? null
  }

  async remove(recordKey: string): Promise<void> {
    await this.mutate((store) => withoutKey(store, recordKey))
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
}

function withoutKey<V>(store: Record<string, V>, recordKey: string): Record<string, V> {
  const updated: Record<string, V> = {}
  for (const [k, v] of Object.entries(store)) {
    if (k !== recordKey) updated[k] = v
  }
  return updated
}
