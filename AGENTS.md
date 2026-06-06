# Agent Navigation Guide

Quick map of this codebase. Start here, then follow the per-directory READMEs.

## Tech stack

React + TypeScript + Vite · Tailwind CSS v4 · TanStack Query v5 · TanStack Router · Zustand · Vitest + React Testing Library

## Where to make changes

| Task                                     | Directory                            |
| ---------------------------------------- | ------------------------------------ |
| New computed value / business rule       | `src/domain/`                        |
| New data type or repository interface    | `src/repositories/types.ts`          |
| New storage backend                      | `src/storage/`                       |
| New server/API query or derived state    | `src/hooks/`                         |
| New UI component                         | `src/components/`                    |
| New page / route                         | `src/views/` + `src/main.tsx` routes |
| New Excel / external service integration | `src/services/`                      |
| New global client state                  | `src/stores/`                        |
| New ambient browser API type             | `src/types/`                         |

## Layer rules (hard)

- **`src/domain/`** — pure functions only. No React, no `fetch`, no repository calls.
- **`src/repositories/`** — data access only. No domain computation beyond trivial mapping.
- **`src/hooks/`** — fetch + domain wiring. Every cache key must go through `QUERY_KEYS` in `src/hooks/queryKeys.ts` — never inline `['someKey']` arrays.
- **`src/views/`** — route-level wiring only. No domain logic that belongs in `src/domain/`.

## Linting and type-checking rules: never disable or remove

**Hard rule — no exceptions.** When a lint or type error fires, fix the code. Never silence it.

- No `// eslint-disable`, `// eslint-disable-next-line`, `/* oxlint-disable */`
- No `@ts-ignore` or `@ts-expect-error`
- No removing or weakening flags in `tsconfig.app.json` / `tsconfig.node.json`
- No removing or overriding rules in `eslint.config.*` or `.oxlintrc`

## TypeScript: no `as` assertions at call sites

See `CONTRIBUTING.md` for the full table. The standard pattern for any `any`-typed source:

```typescript
const data: unknown = anySource
return data as T // unknown → T is acceptable; any → T is not
```

## Testing

- Domain logic: pure unit tests co-located with source (`domain/*.test.ts`).
- Components: `@testing-library/react` with **in-memory repositories** — never mocks.
- Every new domain function needs a test file. Every new component prop/behaviour needs at least one test.
- Run `npx tsc --noEmit && npx vitest run` before committing. All tests must pass.

## Repository pattern

All repositories are interfaces in `src/repositories/types.ts`. Two adapter families:

- `src/repositories/cloud/` — production implementations backed by `StorageAdapter`
- `src/repositories/in-memory/` — test implementations backed by Maps/Sets

Components receive repositories as **props** so tests can inject in-memory instances without mocking.

## Storage modes

Determined at startup by `isLocalFolderMode()` in `src/auth/bootstrapConfig.ts`:

| Mode             | Adapter                                                                                |
| ---------------- | -------------------------------------------------------------------------------------- |
| Cloud (OneDrive) | `OneDriveStorageAdapter` + `LocalStorageAdapter` fallback via `FallbackStorageAdapter` |
| Local folder     | `LocalFolderStorageAdapter` (File System Access API, handle in IndexedDB)              |
| Offline / skip   | `LocalStorageAdapter`                                                                  |

## Undo / redo

Time entry save and delete push `{ description, undo, redo }` commands to `useUndoStore` (`src/stores/undoStore.ts`). Work period mutations do not participate (merge logic is too complex to invert). Max stack: 50.

## Cache invalidation

`useTimeEntryMutations` invalidates `QUERY_KEYS.timeEntriesAll`.
`useWorkPeriodMutations` invalidates `QUERY_KEYS.workWindowsAll`.
Reset operations call `queryClient.invalidateQueries()` (full invalidation).

## Dark mode

Tailwind v4 class-based: `@variant dark (&:where(.dark, .dark *))` in `src/index.css`. The `dark` class is toggled on `document.documentElement` by `useThemeStore`. Always add `dark:` variants alongside light equivalents.

## Key files

| File                          | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `src/repositories/types.ts`   | All repository interfaces and entity types                   |
| `src/repositories/shared.ts`  | Singleton repo instances wired to the active storage adapter |
| `src/hooks/queryKeys.ts`      | Single source of truth for all TanStack Query cache keys     |
| `src/domain/dayStatus.ts`     | Unified day classification (`classifyDay`)                   |
| `src/domain/daySummary.ts`    | Month-level aggregation (`buildMonthSummaries`)              |
| `src/stores/undoStore.ts`     | Undo/redo command stack                                      |
| `src/auth/bootstrapConfig.ts` | Storage mode detection and OAuth config                      |

---

## Workflow rules

### Committing

After every successfully implemented feature, create a single git commit that captures all related changes. Do not leave implemented features uncommitted. One feature = one commit.

### Agent skills

#### Issue tracker

Issues live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

#### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

#### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
