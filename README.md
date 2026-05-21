# Timetracker

A time-tracking Progressive Web App that logs working hours against predefined categories and exports data to a SharePoint Excel template via Microsoft Graph API.

## Tech Stack

- **React 19** + **TypeScript** — Single-page application
- **Vite** — Build tool and dev server
- **TanStack Router** — Type-safe file-based routing
- **TanStack Query** — Async state management
- **Tailwind CSS** — Utility-first styling
- **Zustand** — Client state management
- **OneDrive App Folder** — Persistence (user's own cloud via Graph API)
- **MSAL.js** — Microsoft Work/School login + Graph API access
- **vite-plugin-pwa** — Offline support via service worker
- **Vitest** + **React Testing Library** — Unit and component tests
- **Playwright** — End-to-end tests

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
| `npm run test:unit` | Run only unit tests |
| `npm run test:component` | Run only component tests |

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
├── components/    # Reusable UI components
├── domain/        # Domain models and business logic
├── repositories/  # Data access layer (repository interfaces)
│   ├── in-memory/ # In-memory implementations (tests, offline)
│   └── cloud/     # OneDrive-backed implementations (production)
├── storage/       # StorageAdapter abstraction (OneDrive Graph API)
├── stores/        # Zustand state stores
├── routes/        # TanStack Router route definitions
├── test/          # Test setup and utilities
└── views/         # Page-level view components
e2e/               # Playwright end-to-end tests
docs/
├── adr/           # Architecture Decision Records
└── agents/        # Agent workflow documentation
```

## Persistence Architecture

Data is stored as JSON files in the user's **OneDrive App Folder** via Microsoft Graph API. No database or backend required — the user owns their data in their own cloud.

```
/Apps/Timetracker/
  config.json          # App settings
  time-entries.json    # All time bookings
  work-windows.json    # Work duration blocks
  sprint-exports.json  # Export status per sprint
  work-locations.json  # Office/Remote per day
  day-type-overrides.json  # Vacation/Sick/etc overrides
```

See [ADR 0005](docs/adr/0005-onedrive-app-folder-persistence.md) for details.

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Azure AD / MSAL
VITE_MSAL_CLIENT_ID=<your-azure-app-client-id>
VITE_MSAL_TENANT_ID=<your-azure-tenant-id>
VITE_MSAL_REDIRECT_URI=http://localhost:5173
```

### Azure AD App Registration

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Create a new registration (single-tenant or multi-tenant)
3. Add a **Redirect URI**: `http://localhost:5173` (type: Single-page application)
4. Under **API permissions**, add:
   - `User.Read` (Microsoft Graph, delegated)
   - `Files.ReadWrite.AppFolder` (Microsoft Graph, delegated) — for OneDrive app data
   - `Files.ReadWrite` (Microsoft Graph, delegated) — for SharePoint Excel access
5. Copy the **Application (client) ID** and **Directory (tenant) ID** into `.env.local`

See `docs/adr/` for the full architectural decisions.

## License

Private — not open-source.
