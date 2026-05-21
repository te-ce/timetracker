# ADR 0007: Runtime MSAL Bootstrap Config via localStorage

## Status

Accepted

## Context

The app requires an Azure AD `clientId` and `tenantId` to initialize MSAL for Microsoft sign-in, OneDrive sync, and SharePoint export. Previously these were supplied as build-time environment variables (`VITE_MSAL_CLIENT_ID`, `VITE_MSAL_TENANT_ID`), requiring each deployer to build the app themselves.

We want to ship a single pre-built SPA that any user can deploy to any hosting URL without a custom build. Multiple users with different Azure AD app registrations should be able to use the same deployment.

### Key constraints

1. `PublicClientApplication` (MSAL) cannot be reconfigured after construction — it must be initialized once with the correct values at startup.
2. MSAL config must be available **before** the app can read data from OneDrive — it cannot live in `AppConfig` (which is OneDrive-backed) without creating a circular dependency.
3. `clientId` and `tenantId` are **not secrets** — they are public identifiers visible in OAuth redirect URLs and JS bundles. The real security boundary is Azure AD's redirect URI allowlist, which restricts which origins can initiate OAuth flows with a given `clientId`.

### Alternatives considered

- **Build-time env vars (status quo)**: Requires every deployer to run a build. Prevents zero-config deployment.
- **Server-side config endpoint**: Requires a backend. Contrary to the pure-SPA architecture.
- **Single shared Azure AD app (one clientId for all)**: Would require the app owner to manage a multi-tenant registration and trust all users — not appropriate for a personal time-tracking tool.

## Decision

Store `clientId` and `tenantId` in `localStorage` under a dedicated `msal-bootstrap-config` key. Never sync this key to OneDrive.

- **`redirectUri`** is auto-derived as `window.location.origin` — no user input required.
- On first launch (no bootstrap config): show a full-screen **Setup Wizard** where the user enters their Azure AD `clientId` and `tenantId`. The wizard can be skipped; the app then runs in **local-only mode** with all Microsoft features disabled.
- On config save: write to `localStorage`, then trigger `window.location.reload()` to re-initialize MSAL with the new config.
- MSAL is initialized at startup only if bootstrap config is present. Without it, the app renders without `<MsalProvider>` and all MS-dependent features display a "not configured" state.
- The Setup Wizard is also accessible from **Settings → Cloud Sync** for users who want to change or add their Azure AD config after initial setup.

## Consequences

- **Zero-build deployment**: Ship once, deploy anywhere. Users configure via the UI.
- **Per-device config**: Bootstrap config is per-browser. Users must re-enter on each new device (acceptable for a personal tool).
- **No security regression**: `clientId`/`tenantId` in localStorage is equivalent to env vars baked into the bundle — both are publicly visible. Azure AD redirect URI allowlist remains the security control.
- **Firebase env vars removed**: `firebase.ts` and the 6 `VITE_FIREBASE_*` env vars are dead code and are removed as part of this change.
