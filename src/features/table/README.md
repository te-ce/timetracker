# features/table/

TableView — spreadsheet-like view of one month. Rows = days (1–31), columns = categories. Each cell shows hours derived from WorkPeriods. Clicking a category cell navigates to DayView with that day pre-selected.

## Key concepts

- **MonthTable** — the data structure built by `buildMonthTable`: rows of `{ date, workedHours, categoryHours: Record<string, number> }`.
- **CategoryColumnHeader** — draggable header that lets users reorder category columns.
- **WorkedHoursCell** — the rightmost column showing total worked hours per day.

## Files

| File                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `TableView.tsx`            | Root view — loads data, renders MonthTable                  |
| `MonthTable.tsx`           | Renders the grid from a pre-built MonthTable data structure |
| `WorkedHoursCell.tsx`      | Displays daily total worked hours                           |
| `CategoryColumnHeader.tsx` | Draggable category column header                            |
| `buildMonthTable.ts`       | Pure function — derives MonthTable rows from Day records    |
| `tableConfig.ts`           | Column visibility and ordering configuration                |
| `categoryMutations.ts`     | Mutations for category column configuration                 |
| `index.ts`                 | Public API barrel                                           |

## How it works

1. `TableView` loads all Day records for the selected month via TanStack Query.
2. `buildMonthTable()` maps each day to a row, calling `calculateCategoryHours()` (from `shared/`) per day.
3. `MonthTable` renders rows. Clicking a cell routes to `/day/:date`.
4. Column order is stored in `AppConfig` and updated via `categoryMutations.ts`.
