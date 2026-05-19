# Timetracker App – Requirements

> Derived from voice recordings (Rödingsmarkt.m4a / Rödingsmarkt 2.m4a)

---

## Overview

A time-tracking app that logs hours against predefined categories and exports the recorded data into an existing Excel template.

---

## 1. Time Tracking & Categories

### 1.1 Fixed Categories (columns in the Excel template)

| # | Category | Description |
|---|---|---|
| 1 | **On Leave** | Holiday, sick leave, other absence |
| 2 | **Training, Events** | Training, team events, celebrations |
| 3 | **Coremedia** | Ceremonies, sprint planning, retros, etc. |
| 4 | **QA** | Quality assurance / testing activities |
| 5 | **Support** | Customer support |
| 6 | **CoPs** | Communities of Practice / guilds |
| 7 | **Bug/Maintenance** | Bug fixes and maintenance tasks |
| 8 | **Infra** | Infrastructure work |
| 9 | **Architecture** | Architecture tasks |
| 10 | **Testwatch** | Testwatch-specific activities |

### 1.2 Automatic Remaining Category (AutoCategory)
- Exactly **one** category can be marked as "automatic" — freely chosen by the user, no default
- That category receives: `actual worked hours for the day − Σ all manual bookings`
- Undershoot (manual bookings > worked hours): the row is **highlighted in red** as a warning
- All other categories are filled **manually only**
- The automatic category is visually distinguished

### 1.3 Investment Columns (dynamic)
- Investments are additional rows in the Excel after the fixed categories
- The app reads the investment rows from the Excel via Graph API during mapping setup
- Bookable categories are automatically created in the app from those rows (name = description or Task ID from Excel)
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

- Sprint length and start date are configured once; the app automatically derives all sprint boundaries
- At the end of a sprint: summary of all tracked hours **per category**
- Displayed as a sprint closing report for the elapsed sprint period

---

## 7. Data Synchronisation & Cloud Storage

Data should be synchronised across devices. The user logs in once — sync runs automatically in the background. Evaluated options:

| Option | Login | Offline | Free Tier | Rating |
|---|---|---|---|---|
| **Firebase (Firestore)** | Google, Apple, GitHub, and more | ✅ automatic (SDK) | 1 GB / 50k reads/day – no pausing | ⭐⭐⭐⭐⭐ |
| **Atlas Device Sync** | Google, Apple, Email, etc. | ✅ best-in-class (Realm) | 512 MB – no pausing | ⭐⭐⭐⭐⭐ |
| **Supabase** | Google, Apple, GitHub, etc. | ❌ manual | 500 MB – **pauses after 1 week** | ⭐⭐⭐ |
| **Appwrite Cloud** | Google, Apple, 30+ OAuth | ❌ manual | 2 GB – **pauses after 1 week** | ⭐⭐⭐ |
| **PocketBase** | OAuth (self-hosted) | ❌ | free but requires own server | ⭐ |

### Decision: Firebase (Firestore + Firebase Auth with Microsoft provider)
- User logs in with a **Microsoft Work/School account** — one-time login
- Firebase Auth simultaneously provides the Microsoft Access Token for Microsoft Graph API
- Time entries and configuration are stored in Firestore under `users/{uid}/`
- The Microsoft Access Token enables direct SharePoint access via Graph API (no second login)
- Free for personal use, no automatic pausing

→ See [ADR 0001](docs/adr/0001-microsoft-only-login.md)

---

## 8. Tech Stack

### Frontend
- **React** (web app)
- **TypeScript** — strict typing throughout the project

### Code Quality
- **ESLint** with TypeScript support (`typescript-eslint`)
  - Rule [`@typescript-eslint/no-unnecessary-condition`](https://typescript-eslint.io/rules/no-unnecessary-condition/) is active (prevents dead branches from redundant conditions)
- Further recommended `typescript-eslint` rules are evaluated as needed

### Testing
- **Unit tests (Vitest)** — pure domain logic: time calculations, AutoCategory, sprint aggregation, DayType
- **Component tests (React Testing Library)** — user-facing behaviour, no implementation details
- **API mocking (Mock Service Worker)** — intercept Graph API at the network level
- **E2E (Playwright)** — critical user flows: login, booking, export
- Repository pattern for Firebase / Graph API → in-memory implementations in tests
- → See [ADR 0002](docs/adr/0002-testing-strategy.md)

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
- Separate pages: **monthly statistics**, **sprint report**, **settings** (Sollstunden, sprint config, Excel mapping, federal state)

---

## 11. Non-Functional Requirements

| Requirement | Description |
|---|---|
| Configurability | Daily Sollstunden, sprint length, federal state, investment categories, AutoCategory |
| Extensibility | Number of investment columns may grow |
| Data integrity | Existing entries are not unintentionally overwritten during export |
| Automatic export | Requires a server-side scheduler (Firebase Cloud Functions + Cloud Scheduler) |
| Platform | Web (React), potentially mobile later |
