# 04 — Mutation Invalidation Hooks

Status: done

## Problem

Each component that mutates data manually constructs its own `useMutation` + `invalidateQueries` call. The knowledge of "which query keys depend on this entity" is scattered across:

- `WorkWindowPanel.tsx` — invalidates `['workWindows']`
- `TimeEntryPanel.tsx` — invalidates `['timeEntries']`
- `DayTypePicker.tsx` — invalidates `['dayTypeOverride']` + `['dayTypeOverrides']`
- `MonthGrid.tsx` — invalidates `['timeEntries', year, month]` (narrower — potential bug)
- `WorkedHoursCell.tsx` — invalidates `['workWindows', date]` (narrower — potential bug)

This is a recurring source of stale-UI bugs: a new component saving a WorkWindow might invalidate only its own key and leave the MonthView stale. There is no **locality** for invalidation rules.

## Solution

Create per-entity mutation hooks in `src/hooks/`:

```typescript
// src/hooks/useWorkWindowMutations.ts
export function useWorkWindowMutations(repository: WorkWindowRepository) {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['workWindows'] })

  const save = useMutation({
    mutationFn: (w: WorkWindow) => repository.save(w),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: invalidate,
  })

  return { save, remove }
}
```

Similarly for `useTimeEntryMutations`, `useDayTypeOverrideMutations`.

Each component imports the hook instead of manually constructing mutations.

## Files to change

- **Create**: `src/hooks/useWorkWindowMutations.ts`
- **Create**: `src/hooks/useTimeEntryMutations.ts`
- **Create**: `src/hooks/useDayTypeOverrideMutations.ts`
- **Refactor**: `src/components/WorkWindowPanel.tsx` — use hook
- **Refactor**: `src/components/TimeEntryPanel.tsx` — use hook
- **Refactor**: `src/components/DayTypePicker.tsx` — use hook
- **Refactor**: `src/components/MonthGrid.tsx` — use hook
- **Refactor**: `src/components/WorkedHoursCell.tsx` — use hook

## Acceptance criteria

- [ ] No component manually calls `invalidateQueries` for these entities
- [ ] All invalidation uses broad prefix keys (e.g. `['workWindows']` not `['workWindows', date]`)
- [ ] `MonthGrid.tsx` and `WorkedHoursCell.tsx` no longer have narrow invalidation (fixing latent bugs)
- [ ] All existing tests pass
- [ ] New hooks have unit tests verifying invalidation breadth

## Benefits

- **Locality**: invalidation rules for an entity live in one place
- **Leverage**: new components that mutate data can't forget to invalidate correctly
- **Bug prevention**: eliminates the recurring class of stale-UI bugs from narrow invalidation
