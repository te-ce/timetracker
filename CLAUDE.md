# Timetracker — Claude Code Guidelines

## Commit discipline

**Every completed feature or fix must be committed before starting the next one.**

- One commit per logical feature/fix — keep them small and focused
- Run `npx tsc --noEmit && npx vitest run` before committing; all tests must pass
- Never leave working changes uncommitted at end of a session
- If multiple features land in one session, split them into separate commits using `git add <files>` per feature group

## Stack

React + TypeScript + Vite + Tailwind CSS + TanStack Query + TanStack Router + Vitest + React Testing Library

## Architecture

- `src/domain/` — pure functions, no side effects, fully unit-tested
- `src/repositories/` — data access behind interfaces; in-memory implementations for tests
- `src/components/` — presentational + container components
- `src/views/` — top-level route views that wire repos and queries together
- `src/hooks/` — shared React hooks

## Testing

- Domain logic: pure unit tests in `src/domain/*.test.ts`
- Components: `@testing-library/react` with in-memory repos — no mocks
- Every new domain function needs a test file
- Every new component prop/behaviour needs at least one test
- Keep tests close to the code they cover (co-located)
