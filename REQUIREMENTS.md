# Timetracker App – Requirements

> Derived from voice recordings (Rödingsmarkt.m4a / Rödingsmarkt 2.m4a)

---

## Overview

A time-tracking app that logs hours against predefined categories and exports the recorded data into an existing Excel template.

---

## 1. Time Tracking & Categories

### 1.1 Fixed Categories (columns in the Excel template)

| #   | Category             | Description                               |
| --- | -------------------- | ----------------------------------------- |
| 1   | **On Leave**         | Holiday, sick leave, other absence        |
| 2   | **Training, Events** | Training, team events, celebrations       |
| 3   | **Coremedia**        | Ceremonies, sprint planning, retros, etc. |
| 4   | **QA**               | Quality assurance / testing activities    |
| 5   | **Support**          | Customer support                          |
| 6   | **CoPs**             | Communities of Practice / guilds          |
| 7   | **Bug/Maintenance**  | Bug fixes and maintenance tasks           |
| 8   | **Infra**            | Infrastructure work                       |
| 9   | **Architecture**     | Architecture tasks                        |
| 10  | **Testwatch**        | Testwatch-specific activities             |

### 1.2 Automatic Remaining Category (AutoCategory)

- A **global default** AutoCategory is set in Settings — freely chosen by the user from fixed or dynamic categories
- Per-day override possible from DayView or MonthGrid (changes which category receives auto hours for that day)
- That category receives: `actual worked hours for the day − Σ all manual bookings`
- The user may **manually override** the auto-computed value in the grid or DayView; clearing the override reverts to the computed value
- Undershoot (manual bookings > worked hours): the row is **highlighted in red** as a warning
- When total entries (including auto) < WorkedHours: day flagged with **unaccounted hours** indicator
- All other categories are filled **manually only**
- The automatic category is visually distinguished (greyed out when computed)

### 1.3 Investment / Dynamic Columns

- Investments are additional rows in the Excel after the fixed categories
- The app reads the investment rows from the Excel via Graph API during mapping setup
- Bookable categories are automatically created in the app from those rows (name = description or Task ID from Excel)
- The user can also add custom categories manually in Settings (`customCategories` list)
- Dynamic categories are usable as TimeEntry targets and as AutoCategory
- Currently one investment; multiple possible in the future
- On fill: already-entered values are shown and can optionally be **overwritten**

---

## 2. Excel Export (SharePoint via Microsoft Graph API)

- The Excel file always resides in **SharePoint**
- The user enters the **SharePoint URL** of the Excel file once in Settings
- The app writes directly via **Microsoft Graph API** — no manual download/upload
- The Microsoft Access Token from login (Firebase Auth + Microsoft provider) is used for Graph API calls

### Export triggers

- **Manual:** The user can export at any time; marks the sprint as `exported`
- **Automatic:** The user configures how many days after sprint end an automatic export occurs — unless already exported manually
- Each sprint has an **ExportStatus** (`pending` / `exported`); a manual export prevents the automatic one

### Table structure

- Columns: **Task ID** | **Effort (decimal)** | **Description** — Task ID and Description are pre-filled and are **not** modified by the app
- Row order: fixed categories first (On Leave through Testwatch), then investment rows
- The app writes only the **effort** value (sprint total per category, decimal)
- The app reads all sheet names via Graph API; the user selects the target sheet once via dropdown
- The configured sheet is used for every export; the user updates it in Settings when needed (e.g. at sprint start)
- Write process: the app locates the mapped row by Task ID → writes the effort value

### Mapping

- The user configures once: app category → row (by Task ID from the Excel)
- Investments: the app reads investment rows from the Excel automatically and creates bookable categories
- Unmapped categories are skipped at export
- Mapping is stored in Firestore

---

## 3. Calendar & Day Types

- Automatic detection of whether a day is a **work day**
- Weekends are automatically excluded
- **Public holidays** are loaded automatically via API — the user configures their **federal state** once
- The following day types must also be settable manually:
  - **Public holiday** → not a work day, no booking, no WorkWindow expected
  - **Vacation** → Sollstunden are automatically booked to "On Leave"
  - **Sick day** → Sollstunden are automatically booked to "On Leave"
  - **Absence** (user-defined) → Sollstunden are automatically booked to "On Leave"

---

## 4. Daily Hours Overview

- The user records one or more **WorkWindows** (start/end time pairs) per day
- **WorkedHours** = Σ duration of all WorkWindows for the day
- **Restarbeitszeit** = `Sollstunden − WorkedHours` — shown once at least one WorkWindow is recorded
  - Positive → hours still missing (visual warning)
  - Negative → overtime (visual indicator)
- All WorkWindows for the day are shown as a list
- The user can indicate per day whether they worked **in the office or remotely** (display/statistics only, no effect on bookings)

---

## 5. Monthly Overview & Statistics

- Total hours for the month
- Overtime in the current month
- **Overtime carry-over:** A one-time starting value entered during onboarding; automatically cumulated thereafter; manually correctable per month
- Percentage fulfilment of monthly target hours
- Daily target working hours are configurable

---

## 6. Sprint Report

### Sprint Configuration

- The user configures the sprint once in Settings:
  - **Sprint start date** — the exact date the first sprint began (ISO date, e.g. `2024-01-08`)
  - **Sprint duration** — length in weeks (e.g. 2 weeks)
- The app automatically derives all past and future sprint boundaries from these two values
- The configuration can be updated at any time; all sprint boundaries recalculate immediately

### Sprint Report

- At the end of a sprint: summary of all tracked hours **per category**
- Displayed as a sprint closing report for the elapsed sprint period

---

## 7. Data Synchronisation & Cloud Storage

Data should be synchronised across devices. The user logs in once — sync runs automatically in the background. Evaluated options:

| Option                   | Login                           | Offline                  | Free Tier                         | Rating     |
| ------------------------ | ------------------------------- | ------------------------ | --------------------------------- | ---------- |
| **Firebase (Firestore)** | Google, Apple, GitHub, and more | ✅ automatic (SDK)       | 1 GB / 50k reads/day – no pausing | ⭐⭐⭐⭐⭐ |
| **Atlas Device Sync**    | Google, Apple, Email, etc.      | ✅ best-in-class (Realm) | 512 MB – no pausing               | ⭐⭐⭐⭐⭐ |
| **Supabase**             | Google, Apple, GitHub, etc.     | ❌ manual                | 500 MB – **pauses after 1 week**  | ⭐⭐⭐     |
| **Appwrite Cloud**       | Google, Apple, 30+ OAuth        | ❌ manual                | 2 GB – **pauses after 1 week**    | ⭐⭐⭐     |
| **PocketBase**           | OAuth (self-hosted)             | ❌                       | free but requires own server      | ⭐         |

### Decision: Firebase (Firestore + Firebase Auth with Microsoft provider)

- User logs in with a **Microsoft Work/School account** — one-time login
- Firebase Auth simultaneously provides the Microsoft Access Token for Microsoft Graph API
- Time entries and configuration are stored in Firestore under `users/{uid}/`
- The Microsoft Access Token enables direct SharePoint access via Graph API (no second login)
- Free for personal use, no automatic pausing

→ See [ADR 0001](docs/adr/0001-microsoft-only-login.md)

---

## 8. Tech Stack

> See [ADR 0003](docs/adr/0003-revised-tech-stack.md) for the full decision record.

### Frontend

- **React 18** (SPA, no SSR — app is fully auth-gated)
- **TypeScript** — strict typing throughout the project
- **Vite** — build tool and dev server

### Auth & API

- **MSAL.js** (`@azure/msal-browser` + `@azure/msal-react`) — Microsoft Work/School login; provides the MS Access Token for Graph API natively
- **Microsoft Graph API** — reads/writes the SharePoint Excel file
- **Firebase Firestore** — persistence and cross-device sync (independent of auth)

### UI

- **shadcn/ui** (Radix UI primitives) — accessible, unstyled components owned by the project
- **Tailwind CSS** — utility-first styling

### State management

- **Zustand** — lightweight sliced stores per domain (entries, config, UI)

### Offline / PWA

- **vite-plugin-pwa** (Workbox) — service worker + offline cache

### Code Quality

- **ESLint** with TypeScript support (`typescript-eslint`)
  - Rule [`@typescript-eslint/no-unnecessary-condition`](https://typescript-eslint.io/rules/no-unnecessary-condition/) is active (prevents dead branches from redundant conditions)

### Testing

- **Unit tests (Vitest)** — pure domain logic: time calculations, AutoCategory, sprint aggregation, DayType
- **Component tests (React Testing Library)** — user-facing behaviour, no implementation details
- **API mocking (Mock Service Worker)** — intercept Graph API at the network level
- **E2E (Playwright)** — critical user flows: login, booking, export
- Repository pattern for Firestore / Graph API → in-memory implementations in tests
- → See [ADR 0002](docs/adr/0002-testing-strategy.md)

### Mobile (future)

- **Expo (React Native)** — domain logic and repository interfaces are portable

---

## 9. Notifications

- When the app is opened, an **in-app banner** is shown if past work days exist that have no WorkWindows or incomplete TimeEntries
- A day is considered **complete** when:
  - It is not a `WorkDay` (weekend, public holiday, vacation, etc.) — automatically complete, **or**
  - At least one WorkWindow has been recorded (AutoCategory covers the rest)
- No push-notification opt-in required

---

## 10. Navigation & Main View

- **Primary view: month calendar** — colour-coded by DayType (work day, weekend, public holiday, vacation, sick, etc.)
- Clicking a day opens the **day detail view**:
  - Record and display WorkWindows
  - WorkedHours and Restarbeitszeit
  - Book TimeEntries per category
  - Mark office/remote
  - Set DayType
  - Set per-day AutoCategory override
- Separate pages: **monthly statistics**, **MonthGrid**, **sprint report**, **settings** (Sollstunden, sprint config, Excel mapping, federal state, AutoCategory default, custom categories, auto-fill rules)

---

## 11. MonthGrid View

- Spreadsheet-like grid: **rows = days (1–31)**, **columns = all categories** (fixed + dynamic)
- Each cell displays booked hours and is **editable inline**
- A **WorkedHours column** shows Σ WorkWindow durations per day and is **editable from the grid**:
  - Clicking the cell opens an inline work-hours logger
  - The user enters a duration (decimal hours, e.g. `4.5`) and can **add further durations** for the same day (multiple WorkWindows)
  - Each entered duration appears as a separate line beneath the input; individual entries can be removed
  - The Σ of all entered durations is stored as WorkedHours for that day
  - The same durations are reflected in the DayView WorkWindows list
- The **AutoCategory column** shows the computed value (greyed out) but accepts manual overrides
  - If the user types a value → stored as override
  - If the user clears the value → reverts to auto-computed
- Days with unaccounted hours (`WorkedHours − Σ all entries > 0`) display a visual flag
- Navigation: month selector (prev / next / current)
- Non-WorkDay rows (weekends, holidays, vacation) are visually muted

---

## 12. Auto-Fill Rules

- The user configures recurring rules that **materialize real TimeEntries** on app load
- Two recurrence patterns:
  - `everyWorkday` — every Mon–Fri
  - `weekly(days, intervalWeeks)` — specific weekday(s) every N weeks (e.g. Monday every 2 weeks)
- Rules **skip non-WorkDay days** (weekends, public holidays, vacation, sick, absence)
- Materialization occurs on app load: scan from last materialization date to today
- Each rule tracks a **`materializedDates`** set — prevents re-creation if the user deleted the entry
- Auto-filled entries are normal TimeEntries (editable, deletable)
- Rules are configured in Settings: category, hours, recurrence pattern, optional label
- A rule definition: `{ id, category, hours, pattern, label?, materializedDates }`

---

## 13. Non-Functional Requirements

| Requirement      | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| Configurability  | Daily Sollstunden, sprint length, federal state, investment categories, AutoCategory |
| Extensibility    | Number of investment columns may grow                                                |
| Data integrity   | Existing entries are not unintentionally overwritten during export                   |
| Automatic export | Requires a server-side scheduler (Firebase Cloud Functions + Cloud Scheduler)        |
| Platform         | Web (React), potentially mobile later                                                |
