import type { StorageAdapter } from './adapter'

export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>()

  get<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key)
    if (raw === undefined) return Promise.resolve(null)
    return Promise.resolve(JSON.parse(raw) as T)
  }

  put<T>(key: string, data: T): Promise<void> {
    this.store.set(key, JSON.stringify(data))
    return Promise.resolve()
  }

  delete(key: string): Promise<void> {
    this.store.delete(key)
    return Promise.resolve()
  }
}
