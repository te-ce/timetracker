Status: ready-for-agent

# #11 Excel Mapping Setup (Graph API)

## What to build

Let the user connect the app to their SharePoint Excel file and map each app category to the correct Excel row. This mapping is used by the export flow (slice #12).

End-to-end slice:
- Settings: user enters the SharePoint URL of their Excel file
- App fetches all sheet names via Microsoft Graph API → user selects target sheet from a dropdown
- App reads investment rows from the selected sheet via Graph API → creates bookable investment categories in the app (name = Beschreibung or Task ID from Excel)
- User maps each fixed category (and investment category) to its Excel row by Task ID
- Unmapped categories are silently skipped at export time
- Mapping and SharePoint URL stored in Firestore via `ConfigRepository`

MSW handler mocks Graph API calls in tests.

## Acceptance criteria

- [ ] User can enter a SharePoint Excel URL in Settings
- [ ] App fetches and lists all sheet names; user picks one
- [ ] Investment rows are read from the sheet and appear as bookable categories in the day view
- [ ] User can map each category to an Excel Task ID
- [ ] Mapping persists across page reloads (Firestore)
- [ ] Unmapped categories produce no error at export time
- [ ] Integration tests use MSW to mock Graph API — no real SharePoint calls

## Blocked by

- `#02 Microsoft Auth`
