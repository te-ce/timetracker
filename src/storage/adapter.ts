/**
 * Abstract storage adapter for reading/writing JSON blobs by key.
 * Implementations: OneDriveStorageAdapter (Graph API), InMemoryStorageAdapter (tests).
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  put<T>(key: string, data: T): Promise<void>
  delete(key: string): Promise<void>
}
