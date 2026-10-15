import type { StorageAdapter } from './adapter'

/**
 * Persists JSON blobs to browser localStorage.
 * Uses an optional key prefix to avoid collisions.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string

  constructor(prefix = 'timetracker_') {
    this.prefix = prefix
  }

  get<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(this.prefix + key)
    if (raw === null) return Promise.resolve(null)
    try {
      const data: unknown = JSON.parse(raw)
      return Promise.resolve(data as T)
    } catch (e) {
      // Corrupt data must not read as empty, or the next write replaces it.
      return Promise.reject(new Error(`Corrupt JSON in localStorage key ${this.prefix + key}`, { cause: e }))
    }
  }

  put<T>(key: string, data: T): Promise<void> {
    localStorage.setItem(this.prefix + key, JSON.stringify(data))
    return Promise.resolve()
  }

  delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key)
    return Promise.resolve()
  }
}
