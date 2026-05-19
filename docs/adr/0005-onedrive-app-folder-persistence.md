# ADR 0005: OneDrive App Folder for Persistence

## Status
Accepted

## Context
The app needs to persist user data (time entries, work windows, config, etc.) across devices. We evaluated Firebase Firestore, but it requires managing a database backend and introduces a dependency the user doesn't control.

The user already authenticates with a Microsoft Work/School account for Excel export via Graph API. Microsoft Graph provides an **App Folder** (`/me/drive/special/approot`) — a hidden, app-scoped directory in the user's OneDrive that requires no extra permissions beyond `Files.ReadWrite.AppFolder`.

## Decision
Persist all app data as JSON files in the user's OneDrive App Folder via Microsoft Graph API.

### Architecture
- **`StorageAdapter`** interface — `get<T>(key)` / `put<T>(key, data)` / `delete(key)`
- **`OneDriveStorageAdapter`** — implements the interface using Graph API endpoints
- **Cloud-backed repositories** — each repository reads/writes a single JSON file via the adapter
- **`InMemoryStorageAdapter`** — used in tests and offline-first local mode

### File layout in OneDrive App Folder
```
/Apps/Timetracker/
  config.json
  time-entries.json
  work-windows.json
  sprint-exports.json
  work-locations.json
  day-type-overrides.json
```

### Graph API endpoints
- Read: `GET /me/drive/special/approot:/{filename}:/content`
- Write: `PUT /me/drive/special/approot:/{filename}:/content` (application/json)
- Delete: `DELETE /me/drive/special/approot:/{filename}:`

### Caching strategy
- On app load: fetch all files, cache in memory
- On mutation: write-through (update memory + fire async PUT)
- ETag-based conflict detection (last-write-wins with warning)

## Consequences
- ✅ No database to manage — zero backend cost
- ✅ User owns their data in their own cloud
- ✅ Single Microsoft auth flow covers persistence + Excel export
- ✅ Repository interface unchanged — in-memory implementations still work for tests
- ✅ Works offline (memory cache) with sync on reconnect
- ❌ No real-time multi-device sync (eventual consistency via polling or on-focus)
- ❌ Graph API rate limits (but personal usage is far below thresholds)
- ❌ Requires `Files.ReadWrite.AppFolder` scope in MSAL config
