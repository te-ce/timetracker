import type { StorageAdapter } from './adapter'

export class ElectronStorageAdapter implements StorageAdapter {
  private api: NonNullable<typeof window.electronAPI>

  constructor() {
    if (!window.electronAPI) throw new Error('ElectronStorageAdapter requires window.electronAPI')
    this.api = window.electronAPI
  }

  get<T>(key: string): Promise<T | null> {
    return this.api.storage.get<T>(key)
  }

  put<T>(key: string, data: T): Promise<void> {
    return this.api.storage.put(key, data)
  }

  delete(key: string): Promise<void> {
    return this.api.storage.delete(key)
  }
}
