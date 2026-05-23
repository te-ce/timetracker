import type { StorageAdapter } from './adapter'
import { loadHandle, verifyPermission } from './folder-handle-store'

export class LocalFolderStorageAdapter implements StorageAdapter {
  private handle: FileSystemDirectoryHandle | null = null

  private async getDir(): Promise<FileSystemDirectoryHandle> {
    if (this.handle) return this.handle
    const stored = await loadHandle()
    if (!stored) throw new Error('No local folder configured.')
    const ok = await verifyPermission(stored)
    if (!ok) throw new Error('Read/write permission denied for local folder.')
    this.handle = stored
    return this.handle
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const dir = await this.getDir()
      const fileHandle = await dir.getFileHandle(`${key}.json`)
      const file = await fileHandle.getFile()
      const data: unknown = JSON.parse(await file.text())
      return data as T
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return null
      throw e
    }
  }

  async put<T>(key: string, data: T): Promise<void> {
    const dir = await this.getDir()
    const fileHandle = await dir.getFileHandle(`${key}.json`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  }

  async delete(key: string): Promise<void> {
    try {
      const dir = await this.getDir()
      await dir.removeEntry(`${key}.json`)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return
      throw e
    }
  }
}
