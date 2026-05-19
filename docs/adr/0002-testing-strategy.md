# ADR 0002: Testing Strategy

## Status
Accepted

## Context
The app contains critical calculation logic (WorkedHours, AutoCategory, Restarbeitszeit, sprint aggregation) as well as external dependencies (Firebase Firestore, Microsoft Graph API). A testing strategy is needed that:
- Guarantees correctness of domain logic
- Reliably simulates external services (no network in tests)
- Fits the React + TypeScript + Vite toolchain
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

### External services (Firebase): Repository pattern + in-memory implementations
- Firebase and Graph API are abstracted behind TypeScript interfaces
- Tests use in-memory implementations — no SDK, no network
- Production implementations are swappable (testability by design)

### E2E tests: Playwright
- Critical user flows covered: login, daily booking, export trigger
- Runs against a local dev instance with MSW handlers (no real Firebase/SharePoint)

## Test pyramid

```
        [E2E — Playwright]
       Critical user flows
      ─────────────────────────
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
  const entries: TimeEntry[] = [{ category: 'QA', hours: 9 }]      // 9h manual

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
// Production: new FirestoreTimeEntryRepository(db)
```

## Consequences
- ✅ Domain logic fully testable without external dependencies
- ✅ No network in unit and integration tests → fast and deterministic
- ✅ MSW handlers can be reused in Storybook / manual testing
- ✅ Repository pattern enforces clean layer separation
- ❌ MSW setup effort is initially higher than simple `jest.mock`
- ❌ Playwright requires a running app instance in CI
