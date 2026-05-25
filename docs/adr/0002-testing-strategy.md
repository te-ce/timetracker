# ADR 0002: Testing Strategy

## Status

Accepted (updated 2026-05-25: corrected stack references, added e2e scope)

## Context

The app contains critical calculation logic (WorkedHours, AutoCategory, Restarbeitszeit, sprint aggregation) as well as external dependencies (Microsoft Graph API, Electron IPC). A testing strategy is needed that:

- Guarantees correctness of domain logic
- Reliably simulates external services (no network in tests)
- Fits the React + TypeScript + Vite + Electron toolchain
- Is compatible with `@typescript-eslint/no-unnecessary-condition` (strict typing)

## Decision

### Test runner: Vitest

- Native Vite integration, no separate build step
- Compatible with ESM and TypeScript out of the box
- Faster than Jest for Vite projects
- Same API as Jest (minimal learning curve)

### Component tests: React Testing Library (RTL)

- Tests behaviour from the user's perspective, not implementation details
- Guiding principle: `screen.getByRole`, `screen.getByText` instead of internal state queries
- No Enzyme — too tightly coupled to implementation

### API mocking: Mock Service Worker (MSW)

- Intercepts Graph API calls at the network level (no `jest.mock`)
- Same handlers for unit, integration, and manual browser tests
- More realistic than manual mocks: the real `fetch` stack is exercised

### External services: Repository pattern + in-memory implementations

- Graph API and Electron storage are abstracted behind TypeScript interfaces
- Tests use in-memory implementations — no SDK, no network, no IPC
- Production implementations are swappable (testability by design)

### E2E tests: Playwright

- Runs against the Vite dev server (browser mode, not Electron)
- `window.electronAPI` is absent; `FallbackAdapter` degrades to localStorage — this is intentional
- Tests seed minimal config (Sollstunden) into localStorage before each run
- Assert on data outcomes (visible state changes), not DOM structure
- Run in CI on every push

#### Critical flows covered by e2e:

1. **Daily booking** — start WorkWindow → log TimeEntry → AutoCategory resolves → confirm day
2. **Month overview** — confirmed day's status dot turns green in MonthCalendar
3. **Settings** — change Sollstunden → IncompleteBanner reflects new target

#### Out of scope for e2e (tested at lower levels):

- Sprint Excel export (requires Graph API / local file system — too brittle for e2e)
- Electron tray sync, global hotkey, autolaunch (Electron-only, covered by unit tests)
- Auth/MSAL flow (covered by unit tests)

## Test pyramid

```
        [E2E — Playwright]
       Daily booking, month status, settings
      ─────────────────────────────────────────
     [Integration — RTL + MSW]
    Components with API calls
   ───────────────────────────────
  [Unit — Vitest]
  Pure functions: time calculations,
  AutoCategory, sprint aggregation,
  DayType logic
```

## Patterns

### Given/When/Then for all tests

```ts
it('sets AutoCategory to 0 and shows a warning when manual bookings exceed WorkedHours', () => {
  // Given
  const windows: WorkWindow[] = [{ start: '09:00', end: '17:00' }] // 8h
  const entries: TimeEntry[] = [{ category: 'QA', hours: 9 }] // 9h manual

  // When
  const result = calculateAutoCategory(8, entries)

  // Then
  expect(result.hours).toBe(0)
  expect(result.isOverbooked).toBe(true)
})
```

### Boundary values for time calculations

Test explicitly: AutoCategory = 0, negative, exactly equal to WorkedHours; WorkWindow spanning midnight; empty inputs.

### Repository interface pattern

```ts
interface TimeEntryRepository {
  save(entry: TimeEntry): Promise<void>
  findByDateRange(from: Date, to: Date): Promise<TimeEntry[]>
}
// Tests: new InMemoryTimeEntryRepository()
// Production: new CloudTimeEntryRepository(adapter)
```

### E2E localStorage seed pattern

```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('config', JSON.stringify({ sollstunden: 8, /* ... */ }))
  })
})
```

## Consequences

- ✅ Domain logic fully testable without external dependencies
- ✅ No network in unit and integration tests → fast and deterministic
- ✅ MSW handlers can be reused in Storybook / manual testing
- ✅ Repository pattern enforces clean layer separation
- ✅ E2E tests run against Vite dev server — no Electron setup required in CI
- ❌ MSW setup effort is initially higher than simple `jest.mock`
- ❌ Electron-specific features (tray, hotkey) cannot be e2e tested without running the full app
