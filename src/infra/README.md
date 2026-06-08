# infra/

Infrastructure layer — data persistence, storage adapters, and authentication. No feature code. No UI. Features depend on infra; infra never imports from features.

## Contents

| Directory                                 | Purpose                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`auth/`](auth/README.md)                 | MSAL bootstrap config loading and MSAL instance creation                                                   |
| [`storage/`](storage/README.md)           | `StorageAdapter` interface + 5 implementations (OneDrive, localStorage, local folder, Electron, in-memory) |
| [`repositories/`](repositories/README.md) | Repository interfaces and implementations — the data access layer used by all features                     |

## Architecture

```
features / shared
      │
      ▼  (via RepositoryContext)
  repositories/
      │
      ▼  (via StorageAdapter)
  storage/          ←── auth/ (provides access token for OneDrive adapter)
```

Repositories are injected via `RepositoryContext` (in `repositories/RepositoryContext.tsx`). Tests swap in in-memory implementations — no adapter setup required.
