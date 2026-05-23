# Timetracker

A time-tracking Progressive Web App that logs working hours against predefined categories and exports data to a SharePoint Excel template via Microsoft Graph API.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (strict) |
| Build | Vite + vite-plugin-pwa (PWA / offline) |
| Routing | TanStack Router (type-safe, file-based) |
| Async state | TanStack Query |
| Client state | Zustand (auth state + selected date) |
| Styling | Tailwind CSS 4 |
| Auth | MSAL.js (`@azure/msal-browser`) |
| Cloud persistence | OneDrive App Folder via Microsoft Graph API |
| Local persistence | localStorage (offline fallback) + File System Access API (local folder mode) |
| Excel export | Microsoft Graph API (SharePoint) + xlsx (local folder mode) |
| Unit/component tests | Vitest + React Testing Library |
| API mocking | Mock Service Worker (MSW) |
| E2E tests | Playwright |

## Prerequisites

- Node.js v20 or later
- npm (comes with Node.js)

## Getting Started

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve dist/ locally
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit/component tests (Vitest) |
| `npm run e2e` | Run end-to-end tests (Playwright) |

## Running Tests

```bash
npm run test
```

E2E tests require Playwright browser binaries (one-time install):

```bash
npx playwright install --with-deps chromium
npm run e2e
```

## Project Structure

```
src/
├── domain/        # Pure functions, no side effects — fully unit-tested
├── repositories/  # Data access interfaces + in-memory (test) + cloud implementations
│   ├── in-memory/ # In-memory adapters for tests and offline use
│   └── cloud/     # OneDrive-backed JSON store repositories
├── storage/       # StorageAdapter abstraction (OneDrive, localStorage, local folder, in-memory)
├── services/      # External integrations behind interfaces (WorkbookService for Excel/Graph API)
├── hooks/         # Shared React hooks (useMonthQuery, useDayQuery, QUERY_KEYS, mutations)
├── components/    # Reusable UI components
├── views/         # Page-level route views — wire repos, queries, and mutations together
├── stores/        # Zustand stores (auth state, selected date)
├── auth/          # MSAL initialization and bootstrap config
├── routes/        # TanStack Router route definitions
├── types/         # Ambient type declarations extending DOM/third-party types
└── mocks/         # MSW handlers for Graph API (used in tests)
docs/
├── adr/           # Architecture Decision Records
└── agents/        # Agent workflow documentation
e2e/               # Playwright end-to-end tests
```

## Persistence Architecture

Data is stored as JSON files in the user's **OneDrive App Folder** via Microsoft Graph API. No database or backend — the user owns their data in their own cloud.

```
/Apps/Timetracker/
  config.json
  time-entries.json
  work-windows.json
  sprint-exports.json
  work-locations.json
  day-type-overrides.json
  auto-category-overrides.json
  day-confirmations.json
```

The `StorageAdapter` interface has four implementations:

| Implementation | Used for |
|---|---|
| `OneDriveStorageAdapter` | Production cloud sync |
| `LocalStorageAdapter` | Offline fallback cache |
| `LocalFolderStorageAdapter` | Local folder mode (File System Access API) |
| `InMemoryStorageAdapter` | Tests |

See [ADR 0005](docs/adr/0005-onedrive-app-folder-persistence.md) for design details.

## First Launch — Setup Wizard

On first launch the app shows a **Setup Wizard**. Choose one of:

- **Microsoft Azure AD** — enter your `Client ID` and `Tenant ID` to enable cloud sync (OneDrive) and SharePoint export
- **Local Folder** — pick a local folder via the browser's File System Access API; all data stays on-device as JSON files in that folder
- **Skip** — runs in localStorage-only mode; no cross-device sync, no export

### Azure AD App Registration

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Create a new registration
3. Add a **Redirect URI** (type: Single-page application) equal to your deployment URL
   - e.g. `https://timetracker.example.com` or `http://localhost:5173`
4. Under **API permissions**, add:
   - `User.Read` (Microsoft Graph, delegated)
   - `Files.ReadWrite.All` (Microsoft Graph, delegated)
5. Copy the **Application (client) ID** and **Directory (tenant) ID** and paste them into the Setup Wizard

> `clientId` and `tenantId` are not secrets — they are public OAuth identifiers. The real security boundary is the Azure AD redirect URI allowlist. See [ADR 0007](docs/adr/0007-runtime-msal-bootstrap-config.md).

## SharePoint Excel Export

Before exporting sprint hours, configure in **Settings**:

1. **SharePoint URL** — full URL of the `.xlsx` workbook in SharePoint
2. **Target Sheet** — select the worksheet tab to write into
3. **Category Mapping** — map each app category to an Excel row (by Task ID)

Then open the **Sprint Report** for any sprint and click **Export to SharePoint**.

Microsoft sign-in is required for both OneDrive sync and SharePoint export.

## Architecture Decision Records

See [`docs/adr/`](docs/adr/) for recorded design decisions. Key ADRs:

- [ADR 0003](docs/adr/0003-revised-tech-stack.md) — Tech stack (MSAL replaces Firebase Auth)
- [ADR 0005](docs/adr/0005-onedrive-app-folder-persistence.md) — OneDrive App Folder persistence (Firebase Firestore dropped)
- [ADR 0007](docs/adr/0007-runtime-msal-bootstrap-config.md) — Runtime MSAL bootstrap config
- [ADR 0008](docs/adr/0008-actual-tech-stack.md) — Actual current stack (Firebase fully removed, shadcn not adopted)

## License

Private — not open-source.
