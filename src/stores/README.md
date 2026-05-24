# src/stores

Zustand stores for global client state. Only use stores for state that genuinely needs to be shared across components without prop-drilling. Fetched/server state belongs in TanStack Query, not here.

## Stores

### `themeStore.ts` — `useThemeStore`

```typescript
{ theme: 'light' | 'dark', toggleTheme: () => void }
```

Reads initial theme from `localStorage` (`'timetracker-theme'`), falls back to `prefers-color-scheme`. Toggling persists the preference and flips the `dark` class on `document.documentElement`.

### `authStore.ts` — `useAuthStore`

```typescript
{ isAuthenticated: boolean, setIsAuthenticated: (v: boolean) => void }
```

Tracks MSAL login state. Consumed by `SyncIndicator` in the navbar and by auth flows.

### `undoStore.ts` — `useUndoStore`

```typescript
{
  canUndo: boolean, canRedo: boolean,
  push(cmd: UndoCommand): void,
  undo(): Promise<void>,
  redo(): Promise<void>,
}
```

Command-pattern undo/redo stack (max 50 entries). Each `UndoCommand` is `{ description, undo, redo }` where `undo` and `redo` are async functions that call the repository and invalidate queries.

**Currently participates:** `useTimeEntryMutations` — both `save` and `remove` push commands.
**Does not participate:** `useWorkPeriodMutations` — period merges are not cheaply invertible.

### `appStore.ts` — `useAppStore`

```typescript
{ selectedDate: string, setSelectedDate: (date: string) => void }
```

Tracks the currently selected date across navigation. `selectedDate` is a `YYYY-MM-DD` string.
