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

  private toFilename(key: string): string {
    return key.endsWith('.json') ? key : `${key}.json`
  }

  private async resolveParent(
    key: string,
    create: boolean,
  ): Promise<{ parent: FileSystemDirectoryHandle; filename: string }> {
    const parts = this.toFilename(key).split('/')
    const filename = parts.at(-1) ?? ''
    const dirs = parts.slice(0, -1)
    let dir = await this.getDir()
    for (const name of dirs) {
      dir = await dir.getDirectoryHandle(name, { create })
    }
    return { parent: dir, filename }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const { parent, filename } = await this.resolveParent(key, false)
      const fileHandle = await parent.getFileHandle(filename)
      const file = await fileHandle.getFile()
      const data: unknown = JSON.parse(await file.text())
      return data as T
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return null
      throw e
    }
  }

  async put<T>(key: string, data: T): Promise<void> {
    const { parent, filename } = await this.resolveParent(key, true)
    const fileHandle = await parent.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  }

  async delete(key: string): Promise<void> {
    try {
      const { parent, filename } = await this.resolveParent(key, false)
      await parent.removeEntry(filename)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return
      throw e
    }
  }
}
