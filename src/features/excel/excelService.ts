/**
 * Graph API helpers for reading and writing the SharePoint Excel workbook.
 *
 * Access pattern: /shares/{encodedUrl}/driveItem  → workbook endpoints
 * Required scope: Files.ReadWrite.All
 */

import { buildWritePlan, buildArchiveRows, taskIdFromCell } from './exportPlan'

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

const MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 30_000

function retryDelayMs(res: Response): number {
  const seconds = Number(res.headers.get('Retry-After'))
  if (res.headers.get('Retry-After') === null || !Number.isFinite(seconds) || seconds < 0) return DEFAULT_RETRY_DELAY_MS
  return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS)
}

/** fetch that retries 429/503 responses (honouring Retry-After), up to 3 attempts in total. */
async function graphFetch(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, init)
    if ((res.status !== 429 && res.status !== 503) || attempt >= MAX_ATTEMPTS) return res
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs(res)))
  }
}

function workbookBase(sharePointUrl: string): string {
  const id = encodeSharesUrl(sharePointUrl)
  return `https://graph.microsoft.com/v1.0/shares/${id}/driveItem/workbook`
}

/** Returns the names of all worksheets in the workbook. */
export async function listSheets(sharePointUrl: string, token: string): Promise<string[]> {
  const res = await graphFetch(`${workbookBase(sharePointUrl)}/worksheets`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`listSheets failed: ${res.status} ${res.statusText}`)
  const json: { value: { name: string }[] } = await res.json()
  return json.value.map((ws) => ws.name)
}

export interface LocatedExcelRow extends ExcelRow {
  rowNumber: number
}

interface UsedRange {
  startRow: number
  values: unknown[][]
}

async function fetchUsedRange(
  sharePointUrl: string,
  sheet: string,
  token: string,
  failurePrefix: string,
): Promise<UsedRange> {
  const encodedSheet = encodeURIComponent(sheet)
  const res = await graphFetch(`${workbookBase(sharePointUrl)}/worksheets/${encodedSheet}/usedRange(valuesOnly=true)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`${failurePrefix} failed: ${res.status} ${res.statusText}`)
  const json: { values: unknown[][]; address: string } = await res.json()
  // address looks like "Sheet1!A1:C20" or "'My Sheet'!A10"
  const match = /!\$?[A-Za-z]+\$?(\d+)/.exec(json.address)
  return { startRow: match?.[1] ? parseInt(match[1], 10) : 1, values: json.values }
}

function toLocatedRows({ startRow, values }: UsedRange): LocatedExcelRow[] {
  return values.reduce<LocatedExcelRow[]>((rows, row, idx) => {
    const taskId = taskIdFromCell(row[0])
    if (taskId !== null) {
      rows.push({
        taskId,
        description: typeof row[2] === 'string' ? row[2].trim() : '',
        rowNumber: startRow + idx,
      })
    }
    return rows
  }, [])
}

/**
 * Reads rows from the first three columns of the used range on the given sheet.
 * Expects columns: Task ID | Effort | Description
 * Returns all rows that have a non-empty Task ID in column A, with their real sheet row number.
 */
export async function listRows(sharePointUrl: string, sheet: string, token: string): Promise<LocatedExcelRow[]> {
  return toLocatedRows(await fetchUsedRange(sharePointUrl, sheet, token, 'listRows'))
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
  const rows = toLocatedRows(await fetchUsedRange(sharePointUrl, sheet, token, 'writeSprintData range fetch'))
  const encodedSheet = encodeURIComponent(sheet)
  const base = workbookBase(sharePointUrl)

  const plan = buildWritePlan(rows, mapping, hoursPerCategory)

  const writes = plan.map(({ rowNumber, hours }) => {
    const cellAddress = `B${rowNumber}`
    return graphFetch(`${base}/worksheets/${encodedSheet}/range(address='${cellAddress}')`, {
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

function authJsonHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function createSheetWithRows(base: string, token: string, name: string, rows: [string, number][]): Promise<void> {
  const createRes = await graphFetch(`${base}/worksheets`, {
    method: 'POST',
    headers: authJsonHeaders(token),
    body: JSON.stringify({ name }),
  })
  if (!createRes.ok) throw new Error(`archiveSprintData create sheet failed: ${createRes.status}`)
  if (rows.length === 0) return

  try {
    const patchRes = await graphFetch(
      `${base}/worksheets/${encodeURIComponent(name)}/range(address='A1:B${rows.length}')`,
      { method: 'PATCH', headers: authJsonHeaders(token), body: JSON.stringify({ values: rows }) },
    )
    if (!patchRes.ok) throw new Error(`archiveSprintData write failed: ${patchRes.status}`)
  } catch (err) {
    await deleteSheet(base, token, name).catch(() => undefined)
    throw err
  }
}

async function deleteSheet(base: string, token: string, name: string): Promise<void> {
  const res = await graphFetch(`${base}/worksheets/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`archiveSprintData delete sheet failed: ${res.status}`)
}

/**
 * Creates the archive sheet. When overwriting, the new data is written to a temporary sheet
 * first; the old sheet is only deleted once the new one is complete, then the temp sheet is renamed.
 */
export async function archiveSprintData(
  sharePointUrl: string,
  sheetName: string,
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
  token: string,
  overwrite: boolean,
): Promise<void> {
  const base = workbookBase(sharePointUrl)
  const existsRes = await graphFetch(`${base}/worksheets/${encodeURIComponent(sheetName)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!existsRes.ok && existsRes.status !== 404) {
    throw new Error(`archiveSprintData existence check failed: ${existsRes.status}`)
  }
  const exists = existsRes.ok
  if (exists && !overwrite) throw new SheetExistsError(sheetName)

  const rows = buildArchiveRows(mapping, hoursPerCategory)
  if (!exists) {
    await createSheetWithRows(base, token, sheetName, rows)
    return
  }

  const tempName = `~tmp-${Date.now().toString(36)}`
  await createSheetWithRows(base, token, tempName, rows)
  try {
    await deleteSheet(base, token, sheetName)
  } catch (err) {
    await deleteSheet(base, token, tempName).catch(() => undefined)
    throw err
  }
  const renameRes = await graphFetch(`${base}/worksheets/${encodeURIComponent(tempName)}`, {
    method: 'PATCH',
    headers: authJsonHeaders(token),
    body: JSON.stringify({ name: sheetName }),
  })
  if (!renameRes.ok) throw new Error(`archiveSprintData rename sheet failed: ${renameRes.status}`)
}
