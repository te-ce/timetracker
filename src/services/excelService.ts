/**
 * Graph API helpers for reading and writing the SharePoint Excel workbook.
 *
 * Access pattern: /shares/{encodedUrl}/driveItem  → workbook endpoints
 * Required scope: Files.ReadWrite.All
 */

export interface ExcelRow {
  taskId: string
  description: string
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
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as { value: { name: string }[] }
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
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const json = (await res.json()) as { values: unknown[][] }
  return json.values
    .filter((row) => typeof row[0] === 'string' && row[0].trim() !== '')
    .map((row) => ({
      taskId: String(row[0]).trim(),
      description: typeof row[2] === 'string' ? row[2].trim() : '',
    }))
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

  // Build taskId → row index map (1-based, matching Excel row numbers from usedRange start)
  const taskIdToRowIndex = new Map<string, number>()
  rows.forEach((row, idx) => {
    taskIdToRowIndex.set(row.taskId, idx)
  })

  // Determine the actual starting row of the used range
  const rangeRes = await fetch(`${base}/worksheets/${encodedSheet}/usedRange(valuesOnly=true)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!rangeRes.ok) throw new Error(`writeSprintData range fetch failed: ${rangeRes.status}`)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const rangeJson = (await rangeRes.json()) as { address: string }
  // address looks like "Sheet1!A1:C20" — extract starting row number
  const addressMatch = /!.*?(\d+):/.exec(rangeJson.address)
  const startRow = addressMatch ? parseInt(addressMatch[1] ?? '1', 10) : 1

  // Write each mapped category
  const writes: Promise<void>[] = []
  for (const [category, taskId] of Object.entries(mapping)) {
    const rowIdx = taskIdToRowIndex.get(taskId)
    if (rowIdx === undefined) continue
    const hours = hoursPerCategory[category] ?? 0
    const excelRow = startRow + rowIdx
    const cellAddress = `B${excelRow}`
    writes.push(
      fetch(`${base}/worksheets/${encodedSheet}/range(address='${cellAddress}')`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[hours]] }),
      }).then((r) => {
        if (!r.ok) throw new Error(`writeSprintData PATCH ${cellAddress} failed: ${r.status}`)
      }),
    )
  }
  await Promise.all(writes)
}
