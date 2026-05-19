# Timetracker

A time-tracking Progressive Web App that logs working hours against predefined categories and exports data to a SharePoint Excel template via Microsoft Graph API.

## Tech Stack

- **React 19** + **TypeScript** — Single-page application
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **Zustand** — State management
- **Firebase (Firestore)** — Persistence and cross-device sync
- **MSAL.js** — Microsoft Work/School login + Graph API access
- **vite-plugin-pwa** — Offline support via service worker
- **Vitest** + **React Testing Library** — Unit and component tests
- **Playwright** — End-to-end tests
- **MSW** — API mocking for tests

## Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later recommended)
- npm (comes with Node.js)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

### 3. Build for production

```bash
npm run build
```

The output is written to `dist/`. Preview the production build with:

```bash
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit/component tests (Vitest) |
| `npm run e2e` | Run end-to-end tests (Playwright) |

## Running Tests

### Unit & Component Tests

```bash
npm run test
```

### E2E Tests

Playwright requires browser binaries. Install them once:

```bash
npx playwright install --with-deps chromium
```

Then run:

```bash
npm run e2e
```

## Project Structure

```
src/
├── auth/          # Authentication (MSAL) configuration
├── components/    # Reusable UI components
├── domain/        # Domain models and business logic
├── hooks/         # Custom React hooks
├── mocks/         # MSW handlers for API mocking
├── repositories/  # Data access layer (Firestore, Graph API)
├── stores/        # Zustand state stores
├── test/          # Test setup and utilities
└── views/         # Page-level view components
e2e/               # Playwright end-to-end tests
docs/
├── adr/           # Architecture Decision Records
└── agents/        # Agent workflow documentation
```

## Configuration

The app requires two external services:

- **MSAL / Azure AD** — login and Microsoft Graph API access for reading/writing SharePoint Excel files
- **Firebase Firestore** — persistence and cross-device sync for time entries and settings

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Azure AD / MSAL
VITE_MSAL_CLIENT_ID=<your-azure-app-client-id>
VITE_MSAL_TENANT_ID=<your-azure-tenant-id>
VITE_MSAL_REDIRECT_URI=http://localhost:5173

# Firebase
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

### Azure AD App Registration

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Create a new registration (single-tenant or multi-tenant)
3. Add a **Redirect URI**: `http://localhost:5173` (type: Single-page application)
4. Under **API permissions**, add:
   - `User.Read` (Microsoft Graph, delegated)
   - `Files.ReadWrite` (Microsoft Graph, delegated) — for SharePoint Excel access
5. Copy the **Application (client) ID** and **Directory (tenant) ID** into `.env.local`

### Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Firestore Database** (start in production mode)
3. Go to **Project Settings → Your apps** and add a Web app
4. Copy the Firebase config values into `.env.local`

See `docs/adr/` for the full architectural decisions around authentication and persistence.

## License

Private — not open-source.
