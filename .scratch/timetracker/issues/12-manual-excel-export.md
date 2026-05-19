Status: ready-for-agent

# #12 Manual Excel Export

## What to build

Implement the manual export flow: the user triggers an export for a sprint and the app writes the sprint's per-category hour totals into the mapped Excel rows in SharePoint via Microsoft Graph API.

Write rules:
- Only the `Aufwand` (decimal hours) cell is written — Task ID and Beschreibung columns are never touched
- The app locates the target row by matching the configured Task ID
- Unmapped categories are skipped silently
- Already-exported sprints (ExportStatus = `exported`) will not be re-triggered by the automatic export (slice #13), but the user can still force a manual re-export

After a successful export:
- Sprint ExportStatus is set to `exported`
- User sees a confirmation

MSW handler mocks Graph API write calls in tests.

## Acceptance criteria

- [ ] "Export" button is available on the Sprint report screen for sprints with status `pending`
- [ ] Tapping Export writes Σ hours per mapped category to the correct Excel cells
- [ ] Task ID and Beschreibung columns are not modified
- [ ] Sprint ExportStatus changes to `exported` after success
- [ ] Error state is shown if the Graph API call fails
- [ ] Integration tests use MSW to verify correct cells are written without touching real SharePoint

## Blocked by

- `#10 Sprint Configuration + Sprint Report`
- `#11 Excel Mapping Setup`
