Status: ready-for-agent

# #18 MonthGrid — inline editing

## What to build

Make MonthGrid cells editable. Each cell becomes an input on focus. Saving (blur or Enter) creates, updates, or deletes the corresponding TimeEntry. Zero or empty clears the entry.

## Acceptance criteria

- [ ] Clicking a cell turns it into a number input
- [ ] On blur or Enter: saves the value as a TimeEntry (create or update)
- [ ] Setting value to 0 or empty deletes the TimeEntry for that category+day
- [ ] Optimistic updates via TanStack Query mutations
- [ ] WorkedHours column remains read-only
- [ ] Component tests: edit flow (type → blur → saved), delete flow (clear → blur → deleted)

## Blocked by

- #17 MonthGrid — read-only view
