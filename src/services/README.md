# src/services

External integrations. Currently: Excel workbook I/O (Microsoft Graph API and local File System Access).

## `WorkbookService` interface (`workbookService.ts`)

```typescript
listSheets(): Promise<string[]>
listRows(sheet: string): Promise<ExcelRow[]>
writeSprintData(
  sheet: string,
  mapping: Record<string, string>,   // category → Excel Task ID
  hoursPerCategory: Record<string, number>,
): Promise<void>
```

`ExcelRow` = `{ taskId: string; description: string }`.

## Implementations

| Class | File | Transport |
|---|---|---|
| `GraphApiWorkbookService` | `workbookService.ts` | Microsoft Graph API — needs SharePoint URL + `getToken()` callback |
| `LocalFolderWorkbookService` | `workbookService.ts` | File System Access API — needs filename; resolves directory via `loadExcelHandle() ?? loadHandle()` |

## Supporting files

**`excelService.ts`** — raw Graph API calls: `listSheets`, `listRows`, `writeSprintData`. Used only by `GraphApiWorkbookService`.

**`localExcelService.ts`** — File System Access API operations: `listLocalXlsxFiles`, `listLocalSheets`, `listLocalRows`, `writeLocalSprintData`. Resolves the Excel directory as `(await loadExcelHandle()) ?? (await loadHandle())` — separate Excel folder takes precedence over the app data folder.

## Adding a new service

1. Define an interface if the operation has multiple backends.
2. Implement the interface in a new file.
3. Instantiate the correct implementation in the relevant view based on config/mode.
