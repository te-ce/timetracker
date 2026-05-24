# src/auth

Microsoft authentication bootstrap and storage mode detection.

## Files

### `msalInstance.ts`

Initialises `@azure/msal-browser` `PublicClientApplication` from the stored `BootstrapConfig`. Exports:

- `msalInstance` — the MSAL instance, or `null` if no config is stored (local/offline mode).
- `getAccessToken()` — acquires a token silently, falling back to redirect. Scopes: `User.Read`, `Files.ReadWrite.All`.

### `bootstrapConfig.ts`

Manages the two pieces of OAuth config (`clientId`, `tenantId`) and the storage mode flag, all in `localStorage`.

| Function | Description |
|---|---|
| `readBootstrapConfig()` | Returns `BootstrapConfig \| null` from localStorage |
| `writeBootstrapConfig(config)` | Persists config and reloads the page |
| `isLocalFolderMode()` | `true` when `'timetracker-local-folder-mode'` flag is set |
| `setLocalFolderMode()` | Sets the flag (page reload required to activate) |
| `isSetupSkipped()` | `true` when the user dismissed the setup wizard |
| `skipSetup()` | Sets the skip flag |

## Startup flow

```
main.tsx
  └─ readBootstrapConfig()
       ├─ has config   → initialise MSAL → cloud mode
       ├─ local-folder flag  → LocalFolderStorageAdapter
       ├─ skip flag    → LocalStorageAdapter (offline)
       └─ neither      → render SetupWizard
```

`shared.ts` in `src/repositories/` reads the same flags to select the storage adapter.
