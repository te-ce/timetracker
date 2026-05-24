# src/storage

Physical storage backends. All implement `StorageAdapter` — a generic key/value interface for typed JSON blobs.

## `StorageAdapter` interface (`adapter.ts`)

```typescript
get<T>(key: string): Promise<T | null>
put<T>(key: string, data: T): Promise<void>
delete(key: string): Promise<void>
```

Keys map to logical data names (e.g. `'config'`, `'time-entries'`). Each adapter decides the physical format.

## Adapters

| File | Class | Backing store | Used when |
|---|---|---|---|
| `in-memory-adapter.ts` | `InMemoryStorageAdapter` | `Map<string, string>` | Tests |
| `localstorage-adapter.ts` | `LocalStorageAdapter` | `localStorage` with configurable prefix | Offline / skip-setup mode |
| `onedrive-adapter.ts` | `OneDriveStorageAdapter` | Microsoft Graph API `/me/drive/special/approot` | Cloud mode (authenticated) |
| `fallback-adapter.ts` | `FallbackStorageAdapter` | Primary + secondary | Cloud mode — writes to both, reads primary first |
| `local-folder-adapter.ts` | `LocalFolderStorageAdapter` | File System Access API (`.json` files in a local directory) | Local folder mode |

`FallbackStorageAdapter` wraps OneDrive (primary) + localStorage (secondary). A 404 from OneDrive returns null; other errors propagate. Writes go to both so offline changes survive.

## Folder handle lifecycle (`folder-handle-store.ts`)

Persists `FileSystemDirectoryHandle` objects in IndexedDB (`timetracker-fs` / `handles` store).

Two independent slots:

| Key | Exported functions | Purpose |
|---|---|---|
| `'folder'` | `saveHandle`, `loadHandle`, `clearHandle` | App data directory (JSON files) |
| `'excel-folder'` | `saveExcelHandle`, `loadExcelHandle`, `clearExcelHandle` | Optional separate Excel workbook directory |

`verifyPermission(handle)` calls `queryPermission` then `requestPermission` with `{ mode: 'readwrite' }`.

`localExcelService.ts` resolves the Excel directory as `(await loadExcelHandle()) ?? (await loadHandle())` — falls back to the app data folder when no separate Excel folder is configured.

## Adding a new adapter

1. Implement `StorageAdapter` from `adapter.ts`.
2. Export from `index.ts`.
3. Wire it in `src/repositories/shared.ts` under the appropriate mode check.
