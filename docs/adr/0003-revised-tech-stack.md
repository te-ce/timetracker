# ADR 0003: Revised Tech Stack

## Status

Accepted — supersedes ADR 0001

## Context

The original stack used Firebase Auth as the Microsoft OAuth provider so that the Microsoft Access Token could be reused for Graph API calls. This is clever but introduces an unnecessary intermediary:

- Two vendor SDKs (Firebase + MSAL) for a single auth concern
- Firebase Firestore is the only remaining reason to keep Firebase in the stack
- The app is a fully auth-gated SPA — SSR/SSG provides no benefit
- "Potentially mobile later" rules out Next.js (incompatible with Expo)
- The auto-export scheduler was planned as a Firebase Cloud Function but can live in any serverless environment

## Decision

### Auth: MSAL.js (Microsoft Authentication Library)

- Use `@azure/msal-browser` + `@azure/msal-react` directly
- Eliminates Firebase as an auth intermediary
- Microsoft Access Token for Graph API is obtained natively — no Firebase SDK needed
- One login covers both app auth and SharePoint/Graph API access (same as before, simpler)

### Persistence: Firebase Firestore (retained)

- Firestore remains the sync backend for time entries and configuration
- The Firestore REST API can be called with a Google Service Account or the Firebase SDK
- Auth is now MSAL-only; Firestore access uses the Firebase SDK independently of auth

### State management: Zustand

- Lightweight (~1 kB), no boilerplate, no context providers required
- Fits a domain-heavy SPA (time entries, config, sprint state) better than Redux
- Easy to slice per domain (entries store, config store, UI store)

### UI: shadcn/ui + Tailwind CSS

- shadcn/ui provides unstyled, accessible components (Radix UI primitives)
- Full design control — components are copied into the repo, not a black-box dependency
- Tailwind CSS for utility-first styling; no separate CSS-in-JS runtime

### PWA: vite-plugin-pwa

- Time tracking benefits strongly from offline capability
- Service worker + manifest generated automatically
- Workbox handles cache strategies with minimal config

### Build: Vite (React SPA, retained)

- No change — Vite remains the build tool
- SPA deployment: Azure Static Web Apps, Vercel, or Firebase Hosting (static)
- No server runtime required

### Mobile (future): Expo (React Native)

- Planned future extension; React SPA code (domain logic, repositories) is portable
- Expo is incompatible with Next.js — confirmed SPA choice

### Auto-export scheduler

- Remains a serverless function; implementation deferred
- Candidates: Firebase Cloud Functions, Azure Functions, Vercel Cron

## Full stack summary

| Layer                     | Technology                                           |
| ------------------------- | ---------------------------------------------------- |
| Frontend framework        | React 18 + TypeScript (strict)                       |
| Build tool                | Vite                                                 |
| Auth                      | MSAL.js (`@azure/msal-browser`, `@azure/msal-react`) |
| Graph API                 | Microsoft Graph API (MS Access Token from MSAL)      |
| Persistence               | Firebase Firestore (SDK, independent of auth)        |
| State management          | Zustand                                              |
| UI components             | shadcn/ui (Radix UI primitives)                      |
| Styling                   | Tailwind CSS                                         |
| Offline / PWA             | vite-plugin-pwa (Workbox)                            |
| Unit tests                | Vitest + React Testing Library                       |
| API mocking               | Mock Service Worker (MSW)                            |
| E2E tests                 | Playwright                                           |
| Linting                   | ESLint + typescript-eslint (strict)                  |
| Mobile (future)           | Expo (React Native)                                  |
| Export scheduler (future) | Serverless function (TBD)                            |

## Consequences

- ✅ Single vendor for auth (Microsoft only — matches target audience)
- ✅ No Firebase Auth SDK in the bundle
- ✅ Zustand reduces boilerplate vs Redux; easier to test pure store functions
- ✅ shadcn/ui components are owned by the project — no upstream breaking changes
- ✅ Offline support out of the box via PWA
- ✅ SPA stays Expo-compatible for future mobile
- ❌ MSAL token refresh must be handled explicitly (was implicit via Firebase)
- ❌ Firestore is still a second vendor alongside Microsoft; revisit if moving fully Azure-native
