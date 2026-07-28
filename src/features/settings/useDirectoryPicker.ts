import { useState, useEffect } from 'react'
import { verifyPermission } from '../../infra/storage/folder-handle-store'

interface UseDirectoryPickerOptions {
  load: () => Promise<string | null>
  save: (handle: FileSystemDirectoryHandle) => Promise<void>
  clear?: () => Promise<void>
  onPicked?: (name: string) => void
  /** Bypasses the File System Access API flow entirely (e.g. Electron's native folder dialog). */
  pickNative?: (() => Promise<void>) | undefined
}

/** Directory-picker state machine shared by folder-selection settings: load a stored handle,
 * pick a new one via the File System Access API (or a native override), surface permission/abort errors. */
export function useDirectoryPicker({ load, save, clear, onPicked, pickNative }: UseDirectoryPickerOptions) {
  const [name, setName] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load().then(setName)
  }, [load])

  async function pick() {
    setPicking(true)
    setError(null)
    try {
      if (pickNative) {
        await pickNative()
        return
      }
      if (!window.showDirectoryPicker) {
        setError('File System Access API not supported in this browser.')
        return
      }
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      const ok = await verifyPermission(handle)
      if (!ok) {
        setError('Permission denied for selected folder.')
        return
      }
      await save(handle)
      if (onPicked) onPicked(handle.name)
      else setName(handle.name)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Failed to open folder picker')
    } finally {
      setPicking(false)
    }
  }

  async function reset() {
    if (!clear) return
    await clear()
    setName(null)
    setError(null)
  }

  return { name, picking, error, pick, reset }
}
