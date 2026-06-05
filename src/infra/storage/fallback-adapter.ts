import type { StorageAdapter } from './adapter'

/**
 * Composite adapter: reads from primary (OneDrive), falls back to secondary (localStorage).
 * Writes go to both — primary is source of truth, secondary is offline cache.
 */
export class FallbackStorageAdapter implements StorageAdapter {
  private primary: StorageAdapter
  private fallback: StorageAdapter

  constructor(primary: StorageAdapter, fallback: StorageAdapter) {
    this.primary = primary
    this.fallback = fallback
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.primary.get<T>(key)
      if (result !== null) return result
    } catch {
      // Primary unavailable, fall through to fallback
    }
    return this.fallback.get<T>(key)
  }

  async put<T>(key: string, data: T): Promise<void> {
    // Always write to fallback (localStorage) for offline access
    await this.fallback.put(key, data)
    try {
      await this.primary.put(key, data)
    } catch {
      // Primary write failed — data is still in fallback
    }
  }

  async delete(key: string): Promise<void> {
    // Always delete from fallback
    await this.fallback.delete(key)
    try {
      await this.primary.delete(key)
    } catch {
      // Primary delete failed — at least fallback is cleaned
    }
  }
}
