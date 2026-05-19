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

The app requires a Microsoft Work/School account for login. Firebase and Azure AD configuration is managed via environment variables or the Firebase console. See the ADRs in `docs/adr/` for architectural decisions around authentication and data storage.

## License

Private — not open-source.
