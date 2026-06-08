# features/excel/

WorkbookService — abstracts read/write access to the sprint Excel template. Two adapters: one for SharePoint via Microsoft Graph API, one for a local `.xlsx` file via the File System Access API.

No route. Consumed by `features/sprint` for export, and by `features/settings` for sheet/row discovery during mapping configuration.

## Key concepts

- **WorkbookService** — interface with three methods: `listSheets()`, `listRows(sheet)`, `writeSprintData(sheet, mapping, hoursPerCategory)`.
- **ExcelMapping** — `Record<category, taskId>` mapping app categories to Excel row Task IDs (see [CONTEXT.md](../../../CONTEXT.md)).
- **GraphApiWorkbookService** — reads/writes via Graph API (`/shares/{url}/driveItem/workbook`).
- **LocalFolderWorkbookService** — reads/writes a local file using the `xlsx` library + File System Access API.

## Files

| File                   | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `workbookService.ts`   | `WorkbookService` interface definition                         |
| `workbookFactory.ts`   | Factory — returns the right adapter based on current sync mode |
| `excelService.ts`      | `GraphApiWorkbookService` — Graph API implementation           |
| `localExcelService.ts` | `LocalFolderWorkbookService` — local file implementation       |
| `index.ts`             | Public API barrel                                              |

## How it works

`workbookFactory.ts` inspects `AppConfig` and auth state:

- `synced` mode + `sharepointUrl` set → `GraphApiWorkbookService`
- `localFolder` mode → `LocalFolderWorkbookService`

Both adapters implement the same `WorkbookService` interface. Callers (`SprintReportPanel`, `SheetSelector`, etc.) receive the interface — they don't know which adapter is active.
