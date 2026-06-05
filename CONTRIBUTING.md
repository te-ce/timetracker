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

The codebase uses a **vertical (feature-based)** structure. Code is grouped by domain, not by technical type.

```
src/
├── features/          — feature verticals (day, month, table, sprint, settings, excel)
│   └── <feature>/    — flat: components, hooks, domain logic, views — all together
│       └── index.ts  — barrel file defining the public API
├── shared/            — cross-cutting utilities used by 2+ features
├── infra/             — infrastructure (repositories, storage adapters, auth)
│   ├── repositories/  — data access behind interfaces; in-memory implementations for tests
│   ├── storage/       — storage adapters (OneDrive, localStorage, local folder)
│   └── auth/          — OAuth/MSAL config and bootstrap
├── routes/            — route definitions (thin wiring)
├── types/             — ambient type declarations (File System Access API, Electron)
├── test/              — test utilities and setup
└── mocks/             — MSW / test mocks
```

**Rules:**

- A file belongs to the feature that is its **primary consumer**
- If a file is used by 2+ features → it lives in `shared/`
- Other features import through the barrel `index.ts` (e.g., `from '../day'` not `from '../day/dayContext'`)
- `infra/` provides cross-cutting data access — not feature code
- No file should contain both UI and pure domain logic in a single module

## Testing

- Domain logic: pure unit tests co-located with source (e.g., `src/features/day/dayContext.test.ts`)
- Shared domain: tests in `src/shared/*.test.ts`
- Components: `@testing-library/react` with in-memory repos — no mocks
- Every new domain function needs a test file
- Every new component prop/behaviour needs at least one test
- Keep tests close to the code they cover (co-located in the same feature directory)

## TypeScript standards

**No `as` type assertions at call sites.** This is a hard rule with two narrow exceptions:

1. **Type guards** — `as Record<string, unknown>` inside a `val is T` predicate function is the correct pattern to access properties on `unknown`. Acceptable there only.
2. **Unavoidable generic test mocks** — when implementing a generic interface (e.g. `StorageAdapter.get<T>`) in a test, `(stored ?? null) as T | null` is acceptable because there is no type information to narrow from. This should remain inside the test helper, never leak to production code.

All other patterns must use proper typing:

| Instead of                             | Use                                                                |
| -------------------------------------- | ------------------------------------------------------------------ |
| `e.target as Node`                     | `e.target instanceof Node &&` guard                                |
| `e.target as HTMLInputElement`         | `e.target instanceof HTMLInputElement &&` guard                    |
| `value as SomeUnion` from a `<select>` | `isSomeUnion(v: string): v is SomeUnion` guard function            |
| `JSON.parse(raw) as T`                 | `const data: unknown = JSON.parse(raw); return data as T`          |
| `res.json() as T`                      | `const data: unknown = await res.json(); return data as T`         |
| `window as Window & { foo?: Fn }`      | Extend `Window` in `src/types/*.d.ts`                              |
| `req.result as X` from IDBRequest      | `const val: unknown = req.result; return val as X`                 |
| `arr as SomeType[]`                    | `const arr: SomeType[] = [...]`                                    |
| `as never`                             | Use `as unknown as T` if you truly need a bypass, and document why |

The `unknown` intermediate pattern (`const data: unknown = anySource; return data as T`) is the standard here — it satisfies both `no-unsafe-return` and `no-unnecessary-type-assertion` simultaneously.

**Type guard convention** — shared guards live in the feature module closest to the type. Example: `isDayTypeOverride` lives in `src/features/day/dayType.ts`.

**Typed arrays** — never `[x, y] as T[]`. Declare `const items: T[] = [x, y]` instead.

## Code style

- No comments unless the **why** is non-obvious (hidden constraint, workaround for a known bug, surprising invariant)
- No docstrings that restate what the function name already says
- `as const` is fine — it is a const assertion, not a type cast

## React Query

- All cache keys go through `QUERY_KEYS` in `src/shared/queryKeys.ts` — never inline `['someKey', ...]` arrays
- Invalidations must use the same key factory functions, not hand-rolled arrays

## Adding browser APIs not in TypeScript's DOM lib

Put ambient declarations in `src/types/`. The File System Access API permission methods and `showDirectoryPicker` are already there. Do not cast `window` to extend it — extend `Window` in the `.d.ts` file instead.
