Status: ready-for-agent

# #01 Project Scaffold

## What to build

Bootstrap the complete development environment for the Timetracker React app. This is the foundation every other slice builds on. The result is a running dev server, a green test suite, and clean Repository interfaces that all future Firestore/Graph API implementations will satisfy.

Set up:

- React + TypeScript + Vite
- ESLint with `typescript-eslint` (including `@typescript-eslint/no-unnecessary-condition`)
- Vitest + React Testing Library (RTL)
- Mock Service Worker (MSW) — configured for both Node (tests) and browser (dev)
- Playwright — one smoke test to confirm the app loads
- Firebase SDK wired (no auth, no Firestore reads/writes yet — just initialised with placeholder config)

Define Repository interfaces in a `src/repositories/` module:

- `TimeEntryRepository`
- `WorkWindowRepository`
- `ConfigRepository`

Provide in-memory implementations of each interface for use in tests.

## Acceptance criteria

- [ ] `npm run dev` starts a Vite dev server with a placeholder screen (no blank/error page)
- [ ] `npm run test` runs Vitest and all tests pass
- [ ] `npm run lint` passes with zero errors
- [ ] Playwright smoke test passes (`npm run e2e`)
- [ ] Repository interfaces are defined and in-memory implementations exist
- [ ] Firebase SDK is initialised (config values read from `.env`; `.env.example` committed)
- [ ] MSW service worker is registered for the browser dev build

## Blocked by

None — can start immediately.
