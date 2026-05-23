# ADR 0008: Actual Current Tech Stack (Firebase Removed, shadcn Not Adopted)

Date: 2026-05-24

## Status

Accepted — supplements and partially supersedes ADR 0003

## Context

ADR 0003 documented a planned tech stack in which Firebase Firestore was retained as the sync backend and shadcn/ui was selected as the component library. Neither decision held:

**Firebase Firestore** — ADR 0005 replaced Firestore with OneDrive App Folder persistence. ADR 0007 notes "Firebase env vars are dead code and are removed." The `firebase` package remained in `package.json` but is not imported anywhere in `src/`. It is a dead dependency.

**shadcn/ui** — Never installed or adopted. All UI components are hand-written with Tailwind CSS. Radix UI primitives are not in `package.json`.

**React 18 → 19** — ADR 0003 states React 18. The codebase runs React 19.

**TanStack Router** — Not mentioned in ADR 0003 but adopted; replaces plain React Router.

## Decision

Record the actual current stack for accuracy. Remove `firebase` from `package.json` (dead dependency).

## Actual current stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (strict) |
| Build | Vite + vite-plugin-pwa |
| Routing | TanStack Router |
| Async state | TanStack Query (cache keys centralized in `QUERY_KEYS`) |
| Client state | Zustand — two stores: `authStore` (MSAL auth state), `appStore` (selected date) |
| Styling | Tailwind CSS 4 — no component library, all components hand-written |
| Auth | MSAL.js (`@azure/msal-browser` + `@azure/msal-react`) |
| Cloud persistence | OneDrive App Folder via Microsoft Graph API |
| Offline fallback | localStorage (`LocalStorageAdapter`) |
| Local folder mode | File System Access API (`LocalFolderStorageAdapter`) + `xlsx` for Excel I/O |
| Excel export | `WorkbookService` interface — `GraphApiWorkbookService` (cloud) or `LocalFolderWorkbookService` (local) |
| Unit/component tests | Vitest + React Testing Library — in-memory repository implementations, no mocks |
| API mocking | MSW (Graph API handlers) |
| E2E tests | Playwright |
| Linting | ESLint + typescript-eslint (strict) + Prettier |

## What was dropped

- **Firebase** (Auth + Firestore) — fully removed; replaced by MSAL + OneDrive
- **shadcn/ui / Radix UI** — never adopted; plain Tailwind components used instead

## Consequences

- The `firebase` package should be removed from `package.json` to reflect reality
- ADR 0003's stack table is partially outdated; this ADR is the authoritative reference
