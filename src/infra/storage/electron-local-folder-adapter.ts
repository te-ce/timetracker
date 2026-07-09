import type { StorageAdapter } from './adapter'

export const LOCAL_FOLDER_PATH_KEY = 'local-folder-path'

export class ElectronLocalFolderStorageAdapter implements StorageAdapter {
  private api: NonNullable<typeof window.electronAPI>
  private folderPath: string | null = null

  constructor() {
    if (!window.electronAPI) throw new Error('ElectronLocalFolderStorageAdapter requires window.electronAPI')
    this.api = window.electronAPI
  }

  private async getFolderPath(): Promise<string> {
    if (this.folderPath) return this.folderPath
    const stored = await this.api.storage.get<string>(LOCAL_FOLDER_PATH_KEY)
    if (!stored) throw new Error('No local folder configured.')
    this.folderPath = stored
    return stored
  }

  async get<T>(key: string): Promise<T | null> {
    const folderPath = await this.getFolderPath()
    return this.api.localFolder.get<T>(folderPath, key)
  }

  async put<T>(key: string, data: T): Promise<void> {
    const folderPath = await this.getFolderPath()
    await this.api.localFolder.put(folderPath, key, data)
  }

  async delete(key: string): Promise<void> {
    const folderPath = await this.getFolderPath()
    await this.api.localFolder.delete(folderPath, key)
  }
}
