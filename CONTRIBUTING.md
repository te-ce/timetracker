# Contributing to Timetracker

## Commit discipline

**Every completed feature or fix must be committed before starting the next one.**

- One commit per logical feature/fix — keep them small and focused
- Run `npx tsc --noEmit && npx eslint . && npx vitest run` before committing; all must pass
- Never leave working changes uncommitted at end of a session
- If multiple features land in one session, split them into separate commits using `git add <files>` per feature group

## Stack

React + TypeScript + Vite + Tailwind CSS + TanStack Query + TanStack Router + Vitest + React Testing Library

## Architecture

- `src/domain/` — pure functions, no side effects, fully unit-tested
- `src/repositories/` — data access behind interfaces; in-memory implementations for tests
- `src/components/` — presentational + container components
- `src/views/` — top-level route views that wire repos and queries together
- `src/hooks/` — shared React hooks (`useMonthQuery`, `useDayQuery` own all fetch + domain logic for their scope)
- `src/services/` — external integrations (Excel/Graph API) behind interfaces (`WorkbookService`)
- `src/storage/` — storage adapters behind `StorageAdapter` interface (OneDrive, localStorage, local folder, in-memory)
- `src/types/` — ambient type declarations that extend DOM or third-party types (e.g. File System Access API)

## Testing

- Domain logic: pure unit tests in `src/domain/*.test.ts`
- Components: `@testing-library/react` with in-memory repos — no mocks
- Every new domain function needs a test file
- Every new component prop/behaviour needs at least one test
- Keep tests close to the code they cover (co-located)

## TypeScript standards

**No `as` type assertions at call sites.** This is a hard rule with two narrow exceptions:

1. **Type guards** — `as Record<string, unknown>` inside a `val is T` predicate function is the correct pattern to access properties on `unknown`. Acceptable there only.
2. **Unavoidable generic test mocks** — when implementing a generic interface (e.g. `StorageAdapter.get<T>`) in a test, `(stored ?? null) as T | null` is acceptable because there is no type information to narrow from. This should remain inside the test helper, never leak to production code.

All other patterns must use proper typing:

| Instead of | Use |
|---|---|
| `e.target as Node` | `e.target instanceof Node &&` guard |
| `e.target as HTMLInputElement` | `e.target instanceof HTMLInputElement &&` guard |
| `value as SomeUnion` from a `<select>` | `isSomeUnion(v: string): v is SomeUnion` guard function |
| `JSON.parse(raw) as T` | `const data: unknown = JSON.parse(raw); return data as T` |
| `res.json() as T` | `const data: unknown = await res.json(); return data as T` |
| `window as Window & { foo?: Fn }` | Extend `Window` in `src/types/*.d.ts` |
| `req.result as X` from IDBRequest | `const val: unknown = req.result; return val as X` |
| `arr as SomeType[]` | `const arr: SomeType[] = [...]` |
| `as never` | Use `as unknown as T` if you truly need a bypass, and document why |

The `unknown` intermediate pattern (`const data: unknown = anySource; return data as T`) is the standard here — it satisfies both `no-unsafe-return` and `no-unnecessary-type-assertion` simultaneously.

**Type guard convention** — shared guards live in the domain module closest to the type. Example: `isDayTypeOverride` lives in `src/domain/dayType.ts`.

**Typed arrays** — never `[x, y] as T[]`. Declare `const items: T[] = [x, y]` instead.

## Code style

- No comments unless the **why** is non-obvious (hidden constraint, workaround for a known bug, surprising invariant)
- No docstrings that restate what the function name already says
- `as const` is fine — it is a const assertion, not a type cast

## React Query

- All cache keys go through `QUERY_KEYS` in `src/hooks/queryKeys.ts` — never inline `['someKey', ...]` arrays
- Invalidations must use the same key factory functions, not hand-rolled arrays

## Adding browser APIs not in TypeScript's DOM lib

Put ambient declarations in `src/types/`. The File System Access API permission methods and `showDirectoryPicker` are already there. Do not cast `window` to extend it — extend `Window` in the `.d.ts` file instead.
