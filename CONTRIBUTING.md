# Contributing to Timetracker

## Prerequisites

- Node.js v20 or later
- npm (comes with Node.js)
- For E2E tests: `npx playwright install --with-deps chromium` (one-time)

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` if you need local environment overrides.

## Development

```bash
npm run dev          # Vite dev server at http://localhost:5173 (HMR)
npm start            # Vite + Electron together (desktop app)
```

## Building

```bash
npm run build               # type-check + production build → dist/
npm run preview             # serve dist/ locally
npm run electron:build      # build Electron distributable
```

## Testing

### Unit and component tests (Vitest)

```bash
npm run test                # run all tests once
npm run test:coverage       # with coverage report
npm run test:mutation       # Stryker mutation tests
```

Run tests for a single feature:

```bash
npx vitest run src/features/day
npx vitest run src/features/month
npx vitest run src/infra
```

**Testing rules:**

- Domain logic: pure unit tests co-located with source (e.g. `dayContext.test.ts` next to `dayContext.ts`)
- Components: use `@testing-library/react` with in-memory repositories — never mock modules
- Every new domain function needs a test file
- Every new component prop or behavior needs at least one test
- Tests live in the same directory as the code they cover

### End-to-end tests (Playwright)

```bash
npm run e2e
```

E2E tests run against the Vite dev server (started automatically by Playwright's `webServer` config). Tests cover critical user flows that unit tests can't — routing, multi-step interactions, persistence across views.

### Before committing

```bash
npx tsc --noEmit && npx eslint . && npx vitest run
```

All three must pass. CI enforces this.

## Commit discipline

- One commit per logical feature or fix — keep them small and focused
- Every completed feature or fix must be committed before starting the next one
- Never leave working changes uncommitted at end of a session
- If multiple features land in one session, split them with `git add <files>` per group
- Conventional Commits format: `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, etc.

## Project structure

```
src/
├── features/    — feature verticals; each owns components, hooks, domain logic
│   ├── day/     — DayView, WorkPeriod editing, live tracking
│   ├── month/   — MonthCalendar, DaySummary derivation
│   ├── table/   — spreadsheet-like month view
│   ├── sprint/  — sprint report and Excel export
│   ├── settings/— all app configuration
│   └── excel/   — WorkbookService (Graph API + local adapter)
├── shared/      — cross-cutting utilities used by 2+ features
├── infra/       — repositories, storage adapters, auth (no feature code)
├── routes/      — TanStack Router wiring (thin — no logic)
├── types/       — ambient type declarations
├── test/        — Vitest setup
└── mocks/       — MSW Graph API handlers
```

**Placement rules:**

- A file belongs to the feature that is its primary consumer
- Used by 2+ features → move to `shared/`
- Import across features only through `index.ts` barrel files
- `infra/` contains no feature code; features never import concrete adapters or repos
- No file mixes UI and pure domain logic in a single module

## Architecture patterns

### Adding a feature

1. Create `src/features/<name>/` as a flat directory
2. Wire the route in `src/routes/router.ts`
3. Export the public API from `index.ts`
4. Add an in-memory repository implementation if the feature needs persistence

### Repository and storage

Repositories are injected via `RepositoryContext`. Feature hooks call `useRepository()` — they never import concrete adapter or repository classes. Tests use `createInMemoryRepositories()` from `src/infra/repositories/in-memory/`.

### Adding a new storage adapter

1. Implement `StorageAdapter` from `src/infra/storage/adapter.ts`
2. Wire it in `src/infra/repositories/shared.ts` under the appropriate mode check

### Adding browser APIs not in TypeScript's DOM lib

Put ambient declarations in `src/types/`. Do not cast `window` — extend `Window` in the `.d.ts` file instead.

## TypeScript standards

**No `as` type assertions at call sites.** Two narrow exceptions:

1. **Type guards** — `as Record<string, unknown>` inside a `val is T` predicate is acceptable.
2. **Unavoidable generic test mocks** — `(stored ?? null) as T | null` inside test helpers only.

| Instead of                           | Use                                                        |
| ------------------------------------ | ---------------------------------------------------------- |
| `e.target as HTMLInputElement`       | `e.target instanceof HTMLInputElement &&` guard            |
| `value as SomeUnion` from `<select>` | `isSomeUnion(v: string): v is SomeUnion` guard function    |
| `JSON.parse(raw) as T`               | `const data: unknown = JSON.parse(raw); return data as T`  |
| `res.json() as T`                    | `const data: unknown = await res.json(); return data as T` |
| `arr as SomeType[]`                  | `const arr: SomeType[] = [x, y]`                           |
| `window as Window & { foo?: Fn }`    | Extend `Window` in `src/types/*.d.ts`                      |

The `unknown` intermediate pattern satisfies both `no-unsafe-return` and `no-unnecessary-type-assertion` simultaneously.

Type guard functions live in the feature module closest to their type (e.g. `isDayTypeOverride` in `src/features/day/dayType.ts`).

## Linting and type-checking

**Never disable or remove existing rules.** No exceptions.

- Do not add `// eslint-disable`, `// eslint-disable-next-line`, `/* oxlint-disable */`, `@ts-ignore`, or `@ts-expect-error`
- Do not remove or weaken flags in `tsconfig.app.json` or `tsconfig.node.json`
- Do not remove or override rules in `eslint.config.*` or `.oxlintrc`
- When a rule fires, fix the code — never silence it

```bash
npm run lint       # oxlint + ESLint
npm run knip       # check for unused exports and files
npm run format     # Prettier
```

## Code style

- No comments unless the **why** is non-obvious (hidden constraint, workaround for a specific bug, surprising invariant)
- No docstrings that restate what the function name already says
- `as const` is fine — it is a const assertion, not a type cast

## React state patterns

- **Never write `ref.current` during render.** React can replay or discard a render pass, so the mutation can leak from work that never commits. Sync a ref to a prop/value only inside `useEffect`.
- **Reacting to another state value changing → prefer derived state over `useEffect`, but only when you're setting your own component's state.** Compare the incoming value against a "seen" value held in `useState`, and call your own setter directly in the render body when it differs:
  ```ts
  const [seenToken, setSeenToken] = useState(token)
  if (token !== seenToken) {
    setSeenToken(token)
    setEditing(false)
  }
  ```
  This is safe because React discards and immediately re-renders when you call a setter during render — no extra effect, no extra paint/tick, and it stays synchronous with the triggering event (an `useEffect`-based equivalent adds a render round-trip, which can be observable in tests that assert immediately after firing an event).
- **Invoking an external callback/prop as a reaction to a state change still belongs in `useEffect`.** Calling a parent-owned function (e.g. an `onCancel`/`onDone` prop) during render violates React's "cannot update a component while rendering a different component" rule, since you don't control what that callback does. Only the derived-state-in-render trick applies to a component's _own_ setters.

## React Query

- All cache keys go through `QUERY_KEYS` in `src/shared/queryKeys.ts` — never inline `['someKey', ...]` arrays
- Invalidations must use the same key factory functions, not hand-rolled arrays

## Architecture decisions

Significant design choices are recorded as ADRs in `docs/adr/`. Before changing anything in persistence, auth, or core domain concepts, read the relevant ADRs. When making a new significant decision, write a new ADR following the existing format.
