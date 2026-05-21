Status: ready-for-agent

# #03 WorkWindow, WorkedHours & Restarbeitszeit

## What to build

Implement the WorkWindow tracking layer for a single day. A WorkWindow is a start/end time pair representing an actual work period. Multiple WorkWindows per day are supported.

End-to-end slice:

- UI to add and remove WorkWindows for a day (accessible from the Tagesdetailansicht placeholder)
- `WorkedHours` calculation: Σ duration of all WorkWindows for the day
- `Restarbeitszeit` display: `Sollstunden − WorkedHours` — shown only once at least one WorkWindow exists; positive = still missing, negative = Überstunden
- WorkLocation toggle per day: `Office` or `Remote` (display/statistics only, no effect on calculations)
- Persist WorkWindows and WorkLocation via `WorkWindowRepository` → Firestore implementation

## Acceptance criteria

- [ ] User can add a WorkWindow by entering start and end time
- [ ] User can remove an existing WorkWindow
- [ ] WorkedHours updates immediately when WorkWindows change
- [ ] Restarbeitszeit is hidden until at least one WorkWindow is recorded
- [ ] Restarbeitszeit shows a visual distinction for positive (missing) vs negative (Überstunden)
- [ ] WorkLocation (Office / Remote) can be toggled per day
- [ ] WorkWindows and WorkLocation survive a page reload (Firestore persistence)
- [ ] Unit tests cover: empty windows, single window, multiple windows, window spanning midnight, Restarbeitszeit boundary values

## Blocked by

- `#01 Project Scaffold`
