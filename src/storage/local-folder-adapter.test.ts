import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalFolderStorageAdapter } from './local-folder-adapter'

// In-memory File System Access API mock
function makeMemoryFs() {
  const files = new Map<string, string>()

  function makeFileHandle(fullPath: string): FileSystemFileHandle {
    return {
      kind: 'file',
      name: fullPath.split('/').pop()!,
      getFile: () =>
        Promise.resolve({
          text: () => {
            const content = files.get(fullPath)
            if (content === undefined) throw new DOMException('Not found', 'NotFoundError')
            return Promise.resolve(content)
          },
        }),
      createWritable: () => {
        let buf = ''
        return Promise.resolve({
          write: (chunk: string) => { buf += chunk; return Promise.resolve() },
          close: () => { files.set(fullPath, buf); return Promise.resolve() },
        })
      },
      isSameEntry: () => Promise.resolve(false),
      queryPermission: () => Promise.resolve('granted' as const),
      requestPermission: () => Promise.resolve('granted' as const),
    } as unknown as FileSystemFileHandle
  }

  function makeDirectoryHandle(prefix: string): FileSystemDirectoryHandle {
    return {
      kind: 'directory',
      name: prefix.split('/').pop() ?? '',
      getDirectoryHandle: (name: string, opts?: { create?: boolean }) => {
        if (name.includes('/')) return Promise.reject(new TypeError(`getDirectoryHandle does not accept paths: ${name}`))
        const path = prefix ? `${prefix}/${name}` : name
        const exists = [...files.keys()].some((k) => k.startsWith(path + '/') || k === path)
        if (!exists && !opts?.create) {
          return Promise.reject(new DOMException(`${path} not found`, 'NotFoundError'))
        }
        return Promise.resolve(makeDirectoryHandle(path))
      },
      getFileHandle: (name: string, opts?: { create?: boolean }) => {
        if (name.includes('/')) return Promise.reject(new TypeError(`getFileHandle does not accept paths: ${name}`))
        const path = prefix ? `${prefix}/${name}` : name
        if (!files.has(path) && !opts?.create) {
          return Promise.reject(new DOMException(`${path} not found`, 'NotFoundError'))
        }
        return Promise.resolve(makeFileHandle(path))
      },
      removeEntry: (name: string) => {
        if (name.includes('/')) return Promise.reject(new TypeError(`removeEntry does not accept paths: ${name}`))
        const path = prefix ? `${prefix}/${name}` : name
        if (!files.delete(path)) {
          return Promise.reject(new DOMException(`${path} not found`, 'NotFoundError'))
        }
        return Promise.resolve()
      },
      isSameEntry: () => Promise.resolve(false),
      queryPermission: () => Promise.resolve('granted' as const),
      requestPermission: () => Promise.resolve('granted' as const),
    } as unknown as FileSystemDirectoryHandle
  }

  return { root: makeDirectoryHandle(''), files }
}

vi.mock('./folder-handle-store', () => ({
  loadHandle: vi.fn(),
  verifyPermission: vi.fn().mockResolvedValue(true),
  saveHandle: vi.fn(),
}))

import { loadHandle } from './folder-handle-store'

describe('LocalFolderStorageAdapter', () => {
  let fs: ReturnType<typeof makeMemoryFs>

  beforeEach(() => {
    fs = makeMemoryFs()
    vi.mocked(loadHandle).mockResolvedValue(fs.root)
  })

  describe('flat keys (no slash, no extension)', () => {
    it('returns null for unknown key', async () => {
      const adapter = new LocalFolderStorageAdapter()
      expect(await adapter.get('config')).toBeNull()
    })

    it('stores and retrieves a value', async () => {
      const adapter = new LocalFolderStorageAdapter()
      await adapter.put('config', { theme: 'dark' })
      expect(await adapter.get('config')).toEqual({ theme: 'dark' })
    })

    it('deletes a stored value', async () => {
      const adapter = new LocalFolderStorageAdapter()
      await adapter.put('config', { theme: 'dark' })
      await adapter.delete('config')
      expect(await adapter.get('config')).toBeNull()
    })
  })

  describe('nested keys with subdirectory (months/YYYY-MM.json)', () => {
    it('returns null for unknown nested key', async () => {
      const adapter = new LocalFolderStorageAdapter()
      expect(await adapter.get('months/2026-06.json')).toBeNull()
    })

    it('stores and retrieves a value under a nested key', async () => {
      const adapter = new LocalFolderStorageAdapter()
      const data = { '2026-06-01': { entries: [], windows: [] } }
      await adapter.put('months/2026-06.json', data)
      expect(await adapter.get('months/2026-06.json')).toEqual(data)
    })

    it('deletes a nested key', async () => {
      const adapter = new LocalFolderStorageAdapter()
      await adapter.put('months/2026-06.json', { x: 1 })
      await adapter.delete('months/2026-06.json')
      expect(await adapter.get('months/2026-06.json')).toBeNull()
    })

    it('does not double-append .json to keys that already end in .json', async () => {
      const adapter = new LocalFolderStorageAdapter()
      await adapter.put('months/2026-06.json', { stored: true })
      // Should be stored as months/2026-06.json, not months/2026-06.json.json
      expect(fs.files.has('months/2026-06.json')).toBe(true)
      expect(fs.files.has('months/2026-06.json.json')).toBe(false)
    })

    it('stores index file without double extension', async () => {
      const adapter = new LocalFolderStorageAdapter()
      await adapter.put('months-index.json', { '2026-06': true })
      expect(fs.files.has('months-index.json')).toBe(true)
      expect(fs.files.has('months-index.json.json')).toBe(false)
    })
  })
})
