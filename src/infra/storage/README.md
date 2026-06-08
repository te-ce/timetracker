# infra/storage/

`StorageAdapter` interface and five implementations. Repositories use this interface to read/write typed JSON blobs by key — they don't know which storage backend is active.

## Contents

| File                      | Class                       | Purpose                                                               |
| ------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `adapter.ts`              | `StorageAdapter`            | Interface definition                                                  |
| `onedrive-adapter.ts`     | `OneDriveStorageAdapter`    | OneDrive App Folder via Microsoft Graph API                           |
| `localstorage-adapter.ts` | `LocalStorageAdapter`       | Browser `localStorage`                                                |
| `local-folder-adapter.ts` | `LocalFolderStorageAdapter` | Local folder via File System Access API                               |
| `electron-adapter.ts`     | `ElectronStorageAdapter`    | Electron `fs` via IPC preload bridge                                  |
| `in-memory-adapter.ts`    | `InMemoryStorageAdapter`    | Plain JS Map — tests only                                             |
| `fallback-adapter.ts`     | `FallbackStorageAdapter`    | Wraps primary + secondary; writes to both, reads primary first        |
| `folder-handle-store.ts`  | —                           | Persists `FileSystemDirectoryHandle` in IndexedDB across page reloads |

## StorageAdapter interface

```ts
interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  put<T>(key: string, data: T): Promise<void>
  delete(key: string): Promise<void>
}
```

## Which adapter is active

| Mode                 | Primary                     | Fallback                                           |
| -------------------- | --------------------------- | -------------------------------------------------- |
| Signed in (OneDrive) | `OneDriveStorageAdapter`    | `LocalStorageAdapter` via `FallbackStorageAdapter` |
| Local folder         | `LocalFolderStorageAdapter` | `LocalStorageAdapter`                              |
| Electron             | `ElectronStorageAdapter`    | —                                                  |
| Offline / skip       | `LocalStorageAdapter`       | —                                                  |
| Tests                | `InMemoryStorageAdapter`    | —                                                  |

`FallbackStorageAdapter`: reads try primary first; 404 → return null, other errors propagate. Writes go to both so offline edits survive until the next sync.

## Folder handle lifecycle (`folder-handle-store.ts`)

Persists `FileSystemDirectoryHandle` objects across page reloads via IndexedDB (`timetracker-fs` / `handles` store). Two independent slots:

| Key              | Functions                                                | Purpose                                    |
| ---------------- | -------------------------------------------------------- | ------------------------------------------ |
| `'folder'`       | `saveHandle`, `loadHandle`, `clearHandle`                | App data directory (JSON files)            |
| `'excel-folder'` | `saveExcelHandle`, `loadExcelHandle`, `clearExcelHandle` | Optional separate Excel workbook directory |

`verifyPermission(handle)` calls `queryPermission` then `requestPermission` with `{ mode: 'readwrite' }`.
