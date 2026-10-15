# infra/auth/

MSAL bootstrap configuration and MSAL instance initialization. Determines the app's storage/sync mode before any feature code runs.

## Contents

| File                 | Purpose                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `bootstrapConfig.ts` | Read/write `BootstrapConfig` (`clientId`, `tenantId`) and sync mode flags from `localStorage` |
| `msalInstance.ts`    | Create and export the `PublicClientApplication` instance; `getAccessToken()` helper           |

## How it works

```
main.tsx
  └─ readBootstrapConfig()
       ├─ has clientId/tenantId → initialise MSAL → cloud/OneDrive mode
       ├─ local-folder flag set  → LocalFolderStorageAdapter (no MSAL)
       ├─ skip flag set          → LocalStorageAdapter only (offline)
       └─ none of the above      → render SetupWizard
```

`bootstrapConfig.ts` reads and writes `localStorage` directly — `BootstrapConfig` must be available before MSAL is initialized, so it cannot live in `AppConfig` (which itself requires MSAL to load from OneDrive).

`msalInstance.ts` exports `msalInstance` (the MSAL `PublicClientApplication`, or `null` in local/offline mode) and `getAccessToken()`, which acquires a token silently. When that needs user interaction it sets `signInRequired` in `useSyncStatus` (shown in the header) and rejects; `signInAgain()` (from a click) runs `acquireTokenPopup`. Token cache: `localStorage`. Scopes: `User.Read`, `Files.ReadWrite.All` (needed for SharePoint Excel export, see ADR 0005).

`infra/repositories/shared.ts` reads the same flags to select the correct `StorageAdapter`.
