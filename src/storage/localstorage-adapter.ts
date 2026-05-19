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
    return Promise.resolve(JSON.parse(raw) as T)
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
