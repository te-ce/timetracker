import type { StorageAdapter } from './adapter'

export class ElectronStorageAdapter implements StorageAdapter {
  get<T>(key: string): Promise<T | null> {
    return window.electronAPI!.storage.get<T>(key)
  }

  put<T>(key: string, data: T): Promise<void> {
    return window.electronAPI!.storage.put(key, data)
  }

  delete(key: string): Promise<void> {
    return window.electronAPI!.storage.delete(key)
  }
}
