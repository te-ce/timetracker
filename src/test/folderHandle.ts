import { IDBFactory } from 'fake-indexeddb'

/**
 * Stand-in for a FileSystemDirectoryHandle that survives IndexedDB's structured clone:
 * methods live on the prototype (dropped by the clone), only `kind`/`name` are stored.
 */
export class FakeFolderHandle {
  readonly kind = 'directory'
  readonly name: string
  private readonly permission: PermissionState

  constructor(name: string, permission: PermissionState = 'granted') {
    this.name = name
    this.permission = permission
  }

  queryPermission(): Promise<PermissionState> {
    return Promise.resolve(this.permission)
  }

  requestPermission(): Promise<PermissionState> {
    return Promise.resolve(this.permission)
  }
}

export function makeFolderHandle(name: string, permission: PermissionState = 'granted'): FileSystemDirectoryHandle {
  const handle: unknown = new FakeFolderHandle(name, permission)
  return handle as FileSystemDirectoryHandle
}

/** Fresh in-memory IndexedDB so folder-handle-store starts empty. */
export function resetFolderHandleDb(): void {
  globalThis.indexedDB = new IDBFactory()
}

/** verifyPermission only calls requestPermission when the page has a user activation. */
export function setUserActivation(isActive: boolean): void {
  Object.defineProperty(navigator, 'userActivation', { value: { isActive }, configurable: true })
}
