/**
 * Graph API helpers for reading and writing the SharePoint Excel workbook.
 *
 * Access pattern: /shares/{encodedUrl}/driveItem  → workbook endpoints
 * Required scope: Files.ReadWrite.All
 */

import { buildWritePlan, buildArchiveRows } from './exportPlan'

export interface ExcelRow {
  taskId: string
  description: string
}

/** Thrown when archiving would create a worksheet whose name already exists. */
export class SheetExistsError extends Error {
  readonly sheetName: string
  constructor(sheetName: string) {
    super(`Worksheet "${sheetName}" already exists`)
    this.name = 'SheetExistsError'
    this.sheetName = sheetName
  }
}

export function isSheetExistsError(err: unknown): err is SheetExistsError {
  return err instanceof SheetExistsError
}

/**
 * Encodes a SharePoint URL into the base64url format required by the
 * Graph API /shares endpoint.
 */
export function encodeSharesUrl(sharePointUrl: string): string {
  const encoded = btoa(`u=${sharePointUrl}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `u!${encoded}`
}

function workbookBase(sharePointUrl: string): string {
  const id = encodeSharesUrl(sharePointUrl)
  return `https://graph.microsoft.com/v1.0/shares/${id}/driveItem/workbook`
}

/** Returns the names of all worksheets in the workbook. */
export async function listSheets(sharePointUrl: string, token: string): Promise<string[]> {
  const res = await fetch(`${workbookBase(sharePointUrl)}/worksheets`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`listSheets failed: ${res.status} ${res.statusText}`)
  const json: { value: { name: string }[] } = await res.json()
  return json.value.map((ws) => ws.name)
}

/**
 * Reads rows from the first three columns of the used range on the given sheet.
 * Expects columns: Task ID | Effort | Description
 * Returns all rows that have a non-empty Task ID in column A.
 */
export async function listRows(sharePointUrl: string, sheet: string, token: string): Promise<ExcelRow[]> {
  const encodedSheet = encodeURIComponent(sheet)
  const res = await fetch(`${workbookBase(sharePointUrl)}/worksheets/${encodedSheet}/usedRange(valuesOnly=true)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`listRows failed: ${res.status} ${res.statusText}`)
  const json: { values: unknown[][] } = await res.json()
  return json.values.reduce<ExcelRow[]>((rows, row) => {
    if (typeof row[0] === 'string' && row[0].trim() !== '') {
      rows.push({
        taskId: row[0].trim(),
        description: typeof row[2] === 'string' ? row[2].trim() : '',
      })
    }
    return rows
  }, [])
}

/**
 * Writes sprint effort totals to the workbook.
 *
 * For each category in `mapping`, finds the row whose column-A value equals
 * the mapped Task ID and writes the hours total into column B (effort).
 * Rows not present in the used range or unmapped categories are skipped.
 */
export async function writeSprintData(
  sharePointUrl: string,
  sheet: string,
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
  token: string,
): Promise<void> {
  const rows = await listRows(sharePointUrl, sheet, token)
  const encodedSheet = encodeURIComponent(sheet)
  const base = workbookBase(sharePointUrl)

  // Determine the actual starting row of the used range
  const rangeRes = await fetch(`${base}/worksheets/${encodedSheet}/usedRange(valuesOnly=true)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!rangeRes.ok) throw new Error(`writeSprintData range fetch failed: ${rangeRes.status}`)
  const rangeJson: { address: string } = await rangeRes.json()
  // address looks like "Sheet1!A1:C20" — extract starting row number
  const addressMatch = /!.*?(\d+):/.exec(rangeJson.address)
  const startRow = addressMatch ? parseInt(addressMatch[1] ?? '1', 10) : 1

  const plan = buildWritePlan(
    rows.map((row, idx) => ({ taskId: row.taskId, rowNumber: startRow + idx })),
    mapping,
    hoursPerCategory,
  )

  const writes = plan.map(({ rowNumber, hours }) => {
    const cellAddress = `B${rowNumber}`
    return fetch(`${base}/worksheets/${encodedSheet}/range(address='${cellAddress}')`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[hours]] }),
    }).then((r) => {
      if (!r.ok) throw new Error(`writeSprintData PATCH ${cellAddress} failed: ${r.status}`)
    })
  })
  await Promise.all(writes)
}

export async function archiveSprintData(
  sharePointUrl: string,
  sheetName: string,
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
  token: string,
  overwrite: boolean,
): Promise<void> {
  const base = workbookBase(sharePointUrl)
  const encodedName = encodeURIComponent(sheetName)
  const existsRes = await fetch(`${base}/worksheets/${encodedName}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (existsRes.ok) {
    if (!overwrite) throw new SheetExistsError(sheetName)
    const delRes = await fetch(`${base}/worksheets/${encodedName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!delRes.ok) throw new Error(`archiveSprintData delete sheet failed: ${delRes.status}`)
  }
  const createRes = await fetch(`${base}/worksheets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: sheetName }),
  })
  if (!createRes.ok) throw new Error(`archiveSprintData create sheet failed: ${createRes.status}`)

  const rows = buildArchiveRows(mapping, hoursPerCategory)
  if (rows.length === 0) return

  const encodedSheet = encodeURIComponent(sheetName)
  const patchRes = await fetch(`${base}/worksheets/${encodedSheet}/range(address='A1:B${rows.length}')`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows }),
  })
  if (!patchRes.ok) throw new Error(`archiveSprintData write failed: ${patchRes.status}`)
}
