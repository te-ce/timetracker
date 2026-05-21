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

| Script                   | Description                         |
| ------------------------ | ----------------------------------- |
| `npm run dev`            | Start Vite dev server with HMR      |
| `npm run build`          | Type-check and build for production |
| `npm run preview`        | Serve the production build locally  |
| `npm run lint`           | Run ESLint                          |
| `npm run test`           | Run unit/component tests (Vitest)   |
| `npm run e2e`            | Run end-to-end tests (Playwright)   |
| `npm run test:unit`      | Run only unit tests                 |
| `npm run test:component` | Run only component tests            |

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

No environment variables or build-time configuration is required.

### First launch — Setup Wizard

On first launch the app shows a **Setup Wizard**. You can either:

- **Configure Microsoft Azure AD** — enter your `Client ID` and `Tenant ID` to enable cloud sync (OneDrive) and SharePoint export. The app reloads with MSAL initialized.
- **Skip** — the app runs in local-only mode. All data stays in this browser. You can configure Microsoft later from **Settings → Cloud Sync**.

### Azure AD App Registration

Before entering credentials in the Setup Wizard, register an app in Azure AD:

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Create a new registration (single-tenant or multi-tenant)
3. Add a **Redirect URI** equal to the URL you deployed the app to (type: Single-page application)
   - e.g. `https://timetracker.example.com` or `http://localhost:5173` for local dev
4. Under **API permissions**, add:
   - `User.Read` (Microsoft Graph, delegated)
   - `Files.ReadWrite.All` (Microsoft Graph, delegated) — covers OneDrive App Folder storage and SharePoint Excel access
5. Copy the **Application (client) ID** and **Directory (tenant) ID** — paste these into the Setup Wizard

> **Note:** `Files.ReadWrite.All` is required (not `Files.ReadWrite`) because SharePoint-hosted files are outside the user's personal drive.

> **Security:** `clientId` and `tenantId` are not secrets — they are public identifiers visible in every OAuth request. The real security boundary is the Azure AD redirect URI allowlist. See [ADR 0007](docs/adr/0007-runtime-msal-bootstrap-config.md) for details.

See `docs/adr/` for the full architectural decisions.

## Cloud Sync & OneDrive Persistence

The app works fully offline using browser `localStorage`. To sync data across devices and enable SharePoint export, sign in with a Microsoft account.

### Sign in

1. Open **Settings → Cloud Sync**
2. Click **Sign in with Microsoft** and complete the OAuth flow
3. The nav bar shows ☁️ when synced, 💾 when offline

On first sign-in, any locally-held data is automatically uploaded to your OneDrive App Folder. From then on all reads/writes go to OneDrive (with localStorage as an offline cache).

### SharePoint Excel Export

Before exporting sprint hours to SharePoint, configure the export in **Settings**:

1. **SharePoint URL** — paste the full URL of the Excel workbook (`.xlsx`) from SharePoint
2. **Target Sheet** — select the worksheet tab to write hours into
3. **Category Mapping** — map each app category to the corresponding row in the Excel template (by Task ID); investment rows can be imported as DynamicCategories

Once configured, open the **Sprint Report** for any sprint and click **Export to SharePoint**.

> Sign-in is required for both OneDrive persistence and SharePoint export.

## License

Private — not open-source.
