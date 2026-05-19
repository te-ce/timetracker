Status: ready-for-human

# #02 Microsoft Auth

## What to build

Implement sign-in and sign-out using Microsoft Work/School Account via Firebase Auth with the Microsoft OAuth provider. After login the Microsoft Access Token returned by Firebase Auth must be stored and accessible to future Graph API calls — no second login flow.

Per ADR-0001, Microsoft is the only supported login provider.

The human completing this slice must first:
1. Create a Firebase project in the Firebase console and enable the Microsoft OAuth provider
2. Register an Azure app (Entra ID) with the required redirect URIs and expose the `Files.ReadWrite` / `Sites.ReadWrite.All` scopes
3. Populate `.env` with `VITE_FIREBASE_*` values and the Azure client/tenant IDs

Once credentials exist, the implementation covers:
- Sign-in screen with "Sign in with Microsoft" button
- Firebase Auth `signInWithPopup` (or redirect) using the Microsoft provider
- Store/refresh the Microsoft Access Token (handle expiry via Firebase token-refresh)
- Auth-gated routing: unauthenticated users land on the sign-in screen
- Sign-out

## Acceptance criteria

- [ ] Unauthenticated users are redirected to the sign-in screen
- [ ] "Sign in with Microsoft" triggers the Firebase + Microsoft OAuth flow
- [ ] After successful login the user lands on the main app screen
- [ ] The Microsoft Access Token is accessible from a `useAuth` hook / auth context
- [ ] Token refresh is handled (user does not need to re-login on expiry)
- [ ] Sign-out clears the session and returns to the sign-in screen
- [ ] RTL component test covers the sign-in screen render and error state (mocked auth)

## Blocked by

- `#01 Project Scaffold`
