# ADR 0005: OneDrive App Folder for Persistence

## Status

Accepted

## Context

The app needs to persist user data (time entries, work windows, config, etc.) across devices. We evaluated Firebase Firestore, but it requires managing a database backend and introduces a dependency the user doesn't control.

The user already authenticates with a Microsoft Work/School account for Excel export via Graph API. Microsoft Graph provides an **App Folder** (`/me/drive/special/approot`) — a hidden, app-scoped directory in the user's OneDrive. On its own it needs only `Files.ReadWrite.AppFolder`.

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

### Scope: `Files.ReadWrite.All`

The app requests `User.Read` and `Files.ReadWrite.All`, not the narrower `Files.ReadWrite.AppFolder`. The SharePoint Excel export writes to a workbook in a SharePoint site the user picks, outside the App Folder, and that needs `Files.ReadWrite.All`. One token with one consent covers both persistence and export. Requesting only `Files.ReadWrite.AppFolder` for persistence would add a second consent and token without reducing what the app can already access.

### Token cache and expired sessions

- MSAL keeps its token cache in `localStorage`, so the refresh token survives an app restart (Electron quit, closed tab). With `sessionStorage` every restart lost it and sync stopped silently.
- When the silent refresh throws `InteractionRequiredAuthError`, the app does not open a popup by itself (popup blockers reject popups that a click did not start). It shows "Sync paused – sign in" in the header. A click calls `acquireTokenPopup`. Writes made in the meantime stay pending (ADR 0013) and are uploaded after the sign-in.

### Caching strategy

- On app load: fetch all files, cache in memory
- On mutation: write-through (update memory + fire async PUT)
- ETag-based conflict detection (last-write-wins with warning)
- Refined by [ADR 0013](0013-sync-queue-pending-writes-and-etag-conflicts.md): pending offline writes, serialized per-key writes, If-Match conflict retry

## Consequences

- ✅ No database to manage — zero backend cost
- ✅ User owns their data in their own cloud
- ✅ Single Microsoft auth flow covers persistence + Excel export
- ✅ Repository interface unchanged — in-memory implementations still work for tests
- ✅ Works offline (memory cache) with sync on reconnect
- ❌ No real-time multi-device sync (eventual consistency via polling or on-focus)
- ❌ Graph API rate limits (but personal usage is far below thresholds)
- ❌ Requires the broad `Files.ReadWrite.All` scope (needed for the SharePoint Excel export anyway, see above)
