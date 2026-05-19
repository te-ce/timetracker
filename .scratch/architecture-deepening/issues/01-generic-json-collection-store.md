# 01 — Generic JSON-Collection Store

Status: ready-for-agent

## Problem

Five cloud repositories (`time-entry-repository.ts`, `work-window-repository.ts`, `work-location-repository.ts`, `day-type-override-repository.ts`, `sprint-export-repository.ts`) repeat the same load/cache/persist/filter pattern. Each is ~40-50 lines of identical structure:

- Private `cache` field
- `load()` → read from adapter, populate cache
- `persist()` → write cache to adapter
- Upsert by id (findIndex + splice or push)
- Filter by ISO date range
- Delete by id

A bug in caching logic must be fixed in 5 places. The modules are **shallow** by duplication — their interface is no simpler than their implementation.

## Solution

Extract a generic `JsonCollectionStore<T>` class in `src/repositories/cloud/json-collection-store.ts` that encapsulates:

- `load(key: string): Promise<T[]>` with caching
- `persist(): Promise<void>`
- `upsert(item: T, idFn: (item: T) => string): Promise<void>`
- `remove(id: string, idFn: (item: T) => string): Promise<void>`
- `filter(predicate: (item: T) => boolean): Promise<T[]>`

Each concrete repository becomes a typed wrapper (~10 lines) that calls the store with its key and identity function, plus any truly unique query methods (e.g. `findByDate` on WorkWindow).

## Files to change

- **Create**: `src/repositories/cloud/json-collection-store.ts`
- **Refactor**: `src/repositories/cloud/time-entry-repository.ts`
- **Refactor**: `src/repositories/cloud/work-window-repository.ts`
- **Refactor**: `src/repositories/cloud/work-location-repository.ts`
- **Refactor**: `src/repositories/cloud/day-type-override-repository.ts`
- **Refactor**: `src/repositories/cloud/sprint-export-repository.ts`
- **Update**: existing repository tests to verify behavior is preserved

## Acceptance criteria

- [ ] All existing repository tests pass without modification (behavior-preserving)
- [ ] `JsonCollectionStore` has its own unit tests covering cache, upsert, remove, filter
- [ ] Each concrete repository is ≤15 lines (excluding imports)
- [ ] No duplication of load/cache/persist logic across repositories

## Benefits

- **Locality**: caching/persistence bugs fixed in one place
- **Leverage**: new entity types get a repository in ~5 lines
- **Testability**: storage behaviour tested once; per-entity tests shrink to thin integration checks
