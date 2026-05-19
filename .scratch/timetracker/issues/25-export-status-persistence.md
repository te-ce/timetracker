Status: ready-for-agent

# #25 ExportStatus persistence + Sprint Report integration

## What to build

Wire the existing `shouldAutoExport` domain function and `SprintExport` type into the app. Add a `SprintExportRepository` to persist per-sprint export status. Integrate with SprintReportPanel: show the current export status badge (already rendered) fed from real data, and add a "Mark as Exported" button that persists the status change. The SprintView should query the repository for the current sprint's export state.

## Acceptance criteria

- [ ] `SprintExportRepository` interface defined (save, findBySprintIndex)
- [ ] In-memory implementation with tests
- [ ] SprintView queries export status for the displayed sprint
- [ ] SprintReportPanel receives real export status from repository
- [ ] "Mark as Exported" button persists status and updates UI
- [ ] Once exported, button is disabled / hidden
- [ ] Component test verifies mark-as-exported flow

## Blocked by

- #10 Sprint Configuration + Sprint Report
