# infra/repositories/

The data access layer. Features load and persist domain data through repository interfaces injected via `RepositoryContext`. Two implementation sets: `cloud/` (real persistence) and `in-memory/` (tests).

## Contents

```
repositories/
├── RepositoryContext.tsx   — React context providing all repos to the component tree
├── types.ts                — Repository interface definitions
├── configSchema.ts         — Zod schema for AppConfig validation on load
├── shared.ts               — Shared parsing helpers used by both implementation families
├── abstract-month-repository.ts — Storage-agnostic MonthRepository mutation logic shared by cloud/in-memory
├── day-updaters.ts         — Pure Day/WorkPeriod update functions (add/edit/delete WorkPeriod, subtasks, etc.)
├── work-period-merge.ts    — Merges adjacent WorkPeriods
│
├── cloud/                  — Production implementations (delegate to StorageAdapter)
│   ├── month-repository.ts
│   ├── config-repository.ts
│   ├── time-tracking-repository.ts
│   ├── sprint-export-repository.ts
│   ├── json-store.ts       — Low-level read/write cache wrapper over StorageAdapter
│   └── *.test.ts
│
└── in-memory/              — Test implementations (plain JS Maps, no I/O)
    ├── index.ts            — Factory: createInMemoryRepositories()
    ├── month-repository.ts
    ├── config-repository.ts
    ├── time-tracking-repository.ts
    └── sprint-export-repository.ts
```

## Repository interfaces (`types.ts`)

| Interface                | Data it manages                                                         |
| ------------------------ | ----------------------------------------------------------------------- |
| `MonthRepository`        | `Day` records — all WorkPeriods, notes, confirmations, etc. for a month |
| `ConfigRepository`       | `AppConfig` — full app configuration                                    |
| `TimeTrackingRepository` | Active tracking session (`ActiveTracking`)                              |
| `SprintExportRepository` | `ExportStatus` per sprint index                                         |

## How it works

`RepositoryContext.tsx` creates instances (cloud or in-memory depending on sync mode) and provides them to the component tree. Feature hooks call `useRepository()` to obtain the relevant repository.

Cloud repositories delegate all I/O to `json-store.ts`, which wraps a `StorageAdapter` key with an in-memory cache — first read loads from storage, writes update cache and persist. In-memory repositories hold all state in plain JS Maps; no adapter dependency.

`configSchema.ts` validates the config JSON on load via Zod, filling in defaults for missing fields so config files from older app versions parse without throwing.
