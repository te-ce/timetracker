import type { StorageAdapter } from './adapter'
import { LocalFolderStorageAdapter } from './local-folder-adapter'

export const LOCAL_FOLDER_PATH_KEY = 'local-folder-path'

// Users who picked their folder before Electron got native fs support only have a
// FileSystemDirectoryHandle in IndexedDB, not a LOCAL_FOLDER_PATH_KEY path. Fall back to the
// browser-handle adapter for them until they re-pick the folder via the native dialog.
export class ElectronLocalFolderStorageAdapter implements StorageAdapter {
  private api: NonNullable<typeof window.electronAPI>
  private folderPath: string | null = null
  private fallback = new LocalFolderStorageAdapter()

  constructor() {
    if (!window.electronAPI) throw new Error('ElectronLocalFolderStorageAdapter requires window.electronAPI')
    this.api = window.electronAPI
  }

  private async getFolderPath(): Promise<string | null> {
    if (this.folderPath) return this.folderPath
    const stored = await this.api.storage.get<string>(LOCAL_FOLDER_PATH_KEY)
    this.folderPath = stored
    return stored
  }

  async get<T>(key: string): Promise<T | null> {
    const folderPath = await this.getFolderPath()
    if (!folderPath) return this.fallback.get<T>(key)
    return this.api.localFolder.get<T>(folderPath, key)
  }

  async put<T>(key: string, data: T): Promise<void> {
    const folderPath = await this.getFolderPath()
    if (!folderPath) return this.fallback.put(key, data)
    await this.api.localFolder.put(folderPath, key, data)
  }

  async delete(key: string): Promise<void> {
    const folderPath = await this.getFolderPath()
    if (!folderPath) return this.fallback.delete(key)
    await this.api.localFolder.delete(folderPath, key)
  }
}
