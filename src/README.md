# src/

All application source code. Entry point is `main.tsx` → `App.tsx` → `routes/router.ts` → feature views.

## Contents

| Directory / File                  | Purpose                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------- |
| [`features/`](features/README.md) | Feature verticals — each owns its components, hooks, and domain logic           |
| [`shared/`](shared/README.md)     | Cross-cutting utilities, stores, and hooks used by 2+ features                  |
| [`infra/`](infra/README.md)       | Infrastructure layer — repositories, storage adapters, auth                     |
| `routes/router.ts`                | TanStack Router route definitions (thin wiring only — no logic)                 |
| `types/`                          | Ambient declarations extending DOM types (`File System Access API`, `Electron`) |
| `test/setup.ts`                   | Vitest global setup (Testing Library matchers, MSW server lifecycle)            |
| `mocks/`                          | MSW request handlers mocking Microsoft Graph API responses                      |
| `main.tsx`                        | App bootstrap — React root, query client, MSW in dev                            |
| `App.tsx`                         | Root component — router outlet, global providers                                |

## How it works

```
main.tsx
  └─ App.tsx
       └─ RouterProvider (routes/router.ts)
            ├─ /          → MonthView    (features/month)
            ├─ /day/:date → DayView      (features/day)
            ├─ /table     → TableView    (features/table)
            ├─ /sprint    → SprintView   (features/sprint)
            ├─ /stats     → StatsView    (features/stats)
            └─ /settings  → SettingsView (features/settings)
```

Data flows through TanStack Query. All queries and mutations use key factories from `shared/queryKeys.ts`. Repositories are injected via `RepositoryContext` (defined in `infra/repositories/RepositoryContext.tsx`).
