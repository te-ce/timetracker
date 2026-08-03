# Timetracker

A time-tracking app (PWA + Electron desktop) that logs working hours against categories via timed WorkPeriods and exports sprint data to a SharePoint Excel template via Microsoft Graph API.

## Tech Stack

| Layer                | Technology                                                                   |
| -------------------- | ---------------------------------------------------------------------------- |
| Frontend             | React 19 + TypeScript (strict)                                               |
| Build                | Vite + vite-plugin-pwa (PWA / offline)                                       |
| Routing              | TanStack Router (type-safe, file-based)                                      |
| Async state          | TanStack Query                                                               |
| Client state         | Zustand (auth state + selected date)                                         |
| Styling              | Tailwind CSS 4                                                               |
| Auth                 | MSAL.js (`@azure/msal-browser`)                                              |
| Cloud persistence    | OneDrive App Folder via Microsoft Graph API                                  |
| Local persistence    | localStorage (offline fallback) + File System Access API (local folder mode) |
| Excel export         | Microsoft Graph API (SharePoint) + xlsx (local folder mode)                  |
| Unit/component tests | Vitest + React Testing Library                                               |
| API mocking          | Mock Service Worker (MSW)                                                    |
| E2E tests            | Playwright                                                                   |

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

| Script                   | Description                                  |
| ------------------------ | -------------------------------------------- |
| `npm run dev`            | Start Vite dev server with HMR               |
| `npm run build`          | Type-check and build for production          |
| `npm run preview`        | Serve the production build locally           |
| `npm run lint`           | Run oxlint + ESLint                          |
| `npm run test`           | Run unit/component tests (Vitest)            |
| `npm run test:coverage`  | Run tests with coverage report               |
| `npm run test:mutation`  | Run Stryker mutation tests                   |
| `npm run knip`           | Check for unused exports and files           |
| `npm run e2e`            | Run end-to-end tests (Playwright)            |
| `npm run format`         | Format with Prettier                         |
| `npm start`              | Start Vite + Electron together (desktop app) |
| `npm run electron:build` | Build Electron distributable                 |

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
├── features/      # Feature verticals — each owns its components, hooks, and domain logic
│   ├── day/       # DayView, WorkPeriod editing, live tracking, subtasks
│   ├── month/     # MonthGrid, DaySummary derivation, calendar
│   ├── table/     # Monthly table view, category hour aggregation
│   ├── sprint/    # Sprint report, Excel export
│   ├── stats/     # All-time statistics and fun facts over every tracked month
│   ├── settings/  # App config, category mapping, AutoFill rules
│   └── excel/     # WorkbookService (Graph API + local folder adapters)
├── shared/        # Cross-cutting utilities used by 2+ features
├── infra/         # Infrastructure — no feature code
│   ├── repositories/ # MonthRepository + ConfigRepository (cloud + in-memory)
│   ├── storage/   # StorageAdapter (OneDrive, localStorage, local folder, in-memory, Electron)
│   └── auth/      # MSAL bootstrap config and initialization
├── routes/        # TanStack Router route definitions (thin wiring only)
├── types/         # Ambient declarations extending DOM / third-party types
├── test/          # Test utilities and shared setup
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
  months/
    2025-06.json    ← one file per month; holds all WorkPeriods, location, confirmations, etc.
    2025-07.json
    …
  months-index.json
  sprint-exports.json
  active-tracking.json
```

The `StorageAdapter` interface has five implementations:

| Implementation              | Used for                                   |
| --------------------------- | ------------------------------------------ |
| `OneDriveStorageAdapter`    | Production cloud sync                      |
| `LocalStorageAdapter`       | Offline fallback cache                     |
| `LocalFolderStorageAdapter` | Local folder mode (File System Access API) |
| `ElectronStorageAdapter`    | Electron desktop app                       |
| `InMemoryStorageAdapter`    | Tests                                      |

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

## Repository Map

```
timetracker/
├── src/           → all app source code          → src/README.md
│   ├── features/  → feature verticals            → src/features/README.md
│   ├── shared/    → cross-cutting utilities      → src/shared/README.md
│   ├── infra/     → data / auth / storage layer  → src/infra/README.md
│   ├── routes/    → TanStack Router wiring
│   ├── types/     → ambient DOM / Electron types
│   ├── test/      → Vitest setup helpers
│   └── mocks/     → MSW Graph API handlers
├── electron/      → Electron main process + IPC  → electron/README.md
├── e2e/           → Playwright end-to-end tests  → e2e/README.md
├── docs/          → ADRs + agent workflow docs   → docs/README.md
└── scripts/       → build helpers (icon gen)
```

## Architecture Decision Records

See [`docs/adr/`](docs/adr/) for recorded design decisions. Key ADRs:

- [ADR 0003](docs/adr/0003-revised-tech-stack.md) — Tech stack (MSAL replaces Firebase Auth)
- [ADR 0005](docs/adr/0005-onedrive-app-folder-persistence.md) — OneDrive App Folder persistence (Firebase Firestore dropped)
- [ADR 0007](docs/adr/0007-runtime-msal-bootstrap-config.md) — Runtime MSAL bootstrap config
- [ADR 0008](docs/adr/0008-actual-tech-stack.md) — Actual current stack (Firebase fully removed, shadcn not adopted)

## License

Private — not open-source.
