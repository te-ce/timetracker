# docs/

Project documentation: Architecture Decision Records (ADRs) and agent workflow docs.

## Contents

| Directory      | Purpose                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| [`adr/`](adr/) | Architecture Decision Records — recorded design choices with context and consequences |
| `agents/`      | Agent workflow documentation (`domain.md`, `issue-tracker.md`, `triage-labels.md`)    |

## Architecture Decision Records

ADRs record significant decisions made during the project. Read them before changing anything in the areas they cover.

| ADR                                                     | Topic                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| [0001](adr/0001-microsoft-only-login.md)                | Microsoft-only login (no email/password)                               |
| [0002](adr/0002-testing-strategy.md)                    | Testing strategy — in-memory repos over mocks                          |
| [0003](adr/0003-revised-tech-stack.md)                  | Tech stack revision — MSAL replaces Firebase Auth                      |
| [0004](adr/0004-autocategory-override.md)               | AutoCategory per-day override behavior                                 |
| [0005](adr/0005-onedrive-app-folder-persistence.md)     | OneDrive App Folder persistence — Firebase Firestore dropped           |
| [0006](adr/0006-category-tracking-opens-work-window.md) | Starting category tracking opens a WorkPeriod                          |
| [0007](adr/0007-runtime-msal-bootstrap-config.md)       | Runtime MSAL bootstrap config in localStorage                          |
| [0008](adr/0008-actual-tech-stack.md)                   | Current actual tech stack (Firebase fully removed, shadcn not adopted) |
