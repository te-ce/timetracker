# src/repositories

Data access layer. Interfaces in `types.ts`, two concrete families: `cloud/` (production) and `in-memory/` (tests).

## Interfaces (`types.ts`)

| Interface                        | Key methods                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `TimeEntryRepository`            | `save(entry)`, `findByDateRange(from, to)`, `delete(id)`                                  |
| `WorkPeriodRepository`           | `save(window)`, `findByDate(date)`, `findByDateRange(from, to)`, `delete(id)`             |
| `ConfigRepository`               | `get()`, `save(config)`                                                                   |
| `WorkLocationRepository`         | `save(date, location)`, `findByDate(date)`, `findByDateRange(from, to)`, `delete(date)`   |
| `DayTypeOverrideRepository`      | `save(date, dayType)`, `findByDate(date)`, `findByDateRange(from, to)`, `delete(date)`    |
| `AutoCategoryOverrideRepository` | `save(date, category)`, `findByDate(date)`, `findByDateRange(from, to)`, `delete(date)`   |
| `DayConfirmationRepository`      | `confirm(date)`, `unconfirm(date)`, `isConfirmed(date)`, `findConfirmedInRange(from, to)` |
| `SprintExportRepository`         | `save(sprintExport)`, `findBySprintIndex(index)`                                          |
| `TimeTrackingRepository`         | `start(date, category)`, `stop()`, `getActive()`                                          |

Entity types: `TimeEntry`, `WorkPeriod`, `AppConfig`, `WorkLocation`, `DayTypeOverride`, `ActiveTracking`, `SprintExport`.

## `shared.ts` — singleton instances

Exports one instance per repository, wired to the active `StorageAdapter`:

- Cloud mode → `OneDriveStorageAdapter` + localStorage fallback
- Local folder mode → `LocalFolderStorageAdapter`
- Offline/skip → `LocalStorageAdapter`

`resetAllRepositories()` clears all in-memory caches after login (call it when the storage adapter changes identity).

## `cloud/` — production implementations

Backed by `JsonCollectionStore<T>` and `JsonRecordStore<V>` from `cloud/json-store.ts`.

**`json-store.ts`** is the foundation: wraps a `StorageAdapter` key with an in-memory cache. On first read it loads from storage; writes update the cache and persist. Both collection (array) and record (object) shapes are supported.

All cloud repositories follow the same pattern: construct with a `StorageAdapter`, delegate to a store instance, implement the interface.

## `in-memory/` — test implementations

Parallel structure to `cloud/`. Store data in `Map` / `Set` — no persistence, no async I/O beyond `Promise.resolve()`.

**Inject these in tests instead of mocking.** Components accept repositories as props precisely to enable this pattern.
