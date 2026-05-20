Status: ready-for-agent

# Schema: WorkWindow.end nullable

## What to build

Make `WorkWindow.end` optional (`string | null`) to support open WorkWindows — sessions that have started but not yet ended. Update all layers that touch the `WorkWindow` type so the rest of the feature can build on a consistent foundation.

End-to-end scope: type definition → repositories (in-memory + cloud) → domain calculation → tests.

`calculateWorkedHours` should skip open windows (null end) when no current time is provided, returning only the sum of closed windows. The overload for live calculation (passing `now`) is handled in issue #3.

## Acceptance criteria

- [ ] `WorkWindow.end` is typed as `string | null` in `src/repositories/types.ts`
- [ ] `InMemoryWorkWindowRepository` accepts and persists WorkWindows with null end
- [ ] `CloudWorkWindowRepository` round-trips null end correctly (JSON null)
- [ ] `calculateWorkedHours` skips windows with null end when called without a `now` argument
- [ ] All existing WorkWindow tests pass with the updated type
- [ ] No TypeScript errors across the codebase

## Blocked by

None — can start immediately.
