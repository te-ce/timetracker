/**
 * Abstract storage adapter for reading/writing JSON blobs by key.
 * Implementations: OneDriveStorageAdapter (Graph API), InMemoryStorageAdapter (tests).
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  put<T>(key: string, data: T): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * The stored value changed since this adapter last read it (another device
 * wrote it). Callers re-read, re-apply their change and retry. See ADR 0013.
 */
export class StorageConflictError extends Error {
  constructor(key: string) {
    super(`Storage conflict on "${key}": changed since last read`)
    this.name = 'StorageConflictError'
  }
}
