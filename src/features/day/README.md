# features/day/

DayView — the primary editing surface. Shows WorkPeriods for a single date, supports live category tracking (start/stop), WorkPeriod creation/editing, subtasks, day type overrides, and day notes.

## Key concepts

See [CONTEXT.md](../../../CONTEXT.md) for full glossary. Short version:

- **WorkPeriod** — a timed block of work (`{ id, start, end, category, subtasks[] }`). `end: null` = in progress.
- **WorkPeriodSubtask** — a carve-out of hours within a period under a different category; without times it is a retro-logged subtask.
- **Segment** — one contiguous stretch of a WorkPeriod under a single category; the timeline's rendering unit.
- **Break** — time between two WorkPeriods on the same day.
- **AutoCategory** — the default category pre-filled on new periods; overridable per day.
- **DayType** — classification (`WorkDay`, `Vacation`, `SickDay`, etc.) controlling whether periods are expected.

## Files

| File                        | Purpose                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `DayView.tsx`               | Root view — composes all day-level panels                                                   |
| `DayTimeline.tsx`           | The day as one ordered stream of Segments; also embedded in the month table's day dialog    |
| `TrackingBar.tsx`           | The single tracking control: start / stop / start subtask / stop subtask, or log a past day |
| `PeriodBoundaryRow.tsx`     | Announces a WorkPeriod in the stream: times, duration, main category, delete                |
| `SegmentRow.tsx`            | One Segment row; opens `SubtaskEditForm` for subtasks                                       |
| `DayTotalsPanel.tsx`        | Worked, per-category totals, first start, running-since, breaks, at-desk                    |
| `daySegments.ts`            | `deriveSegments()` (the Segment chain) and `derivePeriodWarnings()` (overlap / overbooked)  |
| `dayBreaks.ts`              | `findBreaks()` — time between WorkPeriods                                                   |
| `dayStreamModel.ts`         | `buildDayStream()`, `deriveDayStats()`, `findActiveTracking()`                              |
| `SubtaskForm.tsx`           | Log an untracked subtask: duration, category, note                                          |
| `SubtaskEditForm.tsx`       | Edit a subtask: category, duration or times, note                                           |
| `CategoryPicker.tsx`        | Category `<select>` used by every control above                                             |
| `DayTypePicker.tsx`         | Dropdown to override the day's classification                                               |
| `DayNoteEditor.tsx`         | Free-text note field for the day                                                            |
| `DotPopoverPanel.tsx`       | Popover showing day status dot details                                                      |
| `NotePopoverPanel.tsx`      | Popover showing the day note inline from MonthView                                          |
| `IncompleteBanner.tsx`      | Warning banner when uncategorized hours > 0.01 h                                            |
| `dayContext.ts`             | Derives `WorkedHours`, category breakdown, and balance state from raw WorkPeriods           |
| `dayType.ts`                | `classifyDay()`, `isDayTypeOverride()` type guard, DayType helpers                          |
| `useDayQuery.ts`            | TanStack Query hook to load/subscribe to a Day                                              |
| `useDayMutations.ts`        | Mutations for day-level fields (type, note, confirmation)                                   |
| `useWorkPeriodMutations.ts` | Create, edit, delete WorkPeriods and subtasks (all undoable)                                |
| `index.ts`                  | Public API barrel                                                                           |

## How it works

1. `useDayQuery` loads the `Day` record for the selected date from the repository.
2. `dayContext.ts` derives display state (WorkedHours, uncategorized hours, balance) from the raw data — no side effects.
3. User interactions dispatch mutations (`useDayMutations`, `useWorkPeriodMutations`, `useTrackingMutations`).
4. Each mutation calls the injected `MonthRepository`, whose pure update functions live in `src/infra/repositories/day-updaters.ts`.
5. TanStack Query invalidates the affected cache keys, triggering a re-render.

Live tracking (`end: null`) contributes a `now − start` duration updated on a 1-minute tick.

Only one thing is tracked at a time — either the open WorkPeriod's own category or its live subtask.
`DayTimeline` renders the day as Segments with the Breaks between WorkPeriods; see
[ADR 0010](../../../docs/adr/0010-day-view-segment-stream.md) for why the period cards were replaced.
