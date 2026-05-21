Status: ready-for-human

# #13 Automatic Export (Firebase Cloud Functions)

## What to build

Implement automatic sprint export: if a sprint has not been manually exported, the app exports it automatically N days after the sprint ends. N is configured by the user in Settings.

The human completing this slice must first:

1. Enable Firebase Cloud Functions (Blaze plan required) in the Firebase console
2. Enable Cloud Scheduler API in Google Cloud
3. Deploy the function after implementation

Implementation:

- Settings: "Auto-export N days after sprint end" — configurable integer
- Firebase Cloud Function (scheduled via Cloud Scheduler): runs daily, checks all sprints where `sprintEndDate + N days ≤ today` and `ExportStatus = pending`
- For each matching sprint: performs the same export logic as the manual export (slice #12) using a service account or stored token
- Sets ExportStatus to `exported` after success
- Manual export always takes precedence — function skips already-`exported` sprints

## Acceptance criteria

- [ ] Auto-export delay (days after sprint end) is configurable in Settings and persists
- [ ] Cloud Function fires on schedule and exports eligible sprints
- [ ] Sprints already marked `exported` are skipped
- [ ] Failed auto-exports do not corrupt existing data; error is logged in Firebase
- [ ] Manual export still works independently of the auto-export schedule
- [ ] Function deployment instructions documented in `docs/` or inline README

## Blocked by

- `#12 Manual Excel Export`
