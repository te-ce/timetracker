import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'
import { encodeSharesUrl } from '../services/excelService'

function isWriteBody(val: unknown): val is { values: number[][] } {
  return (
    typeof val === 'object' &&
    val !== null &&
    'values' in val &&
    Array.isArray(val.values)
  )
}

const GRAPH = 'https://graph.microsoft.com/v1.0'

function sharesBase(sharePointUrl: string) {
  return `${GRAPH}/shares/${encodeSharesUrl(sharePointUrl)}/driveItem/workbook`
}

/** Default in-memory workbook state used by MSW Graph API handlers */
export interface MockWorkbook {
  sheets: string[]
  rows: { taskId: string; effort: number; description: string }[]
}

let mockWorkbook: MockWorkbook = {
  sheets: ['Sprint 1', 'Sprint 2'],
  rows: [
    { taskId: 'TASK-001', effort: 0, description: 'On Leave' },
    { taskId: 'TASK-002', effort: 0, description: 'Training' },
    { taskId: 'TASK-003', effort: 0, description: 'Coremedia' },
  ],
}

export function setMockWorkbook(wb: MockWorkbook) {
  mockWorkbook = wb
}

export function buildGraphHandlers(sharePointUrl: string): HttpHandler[] {
  const base = sharesBase(sharePointUrl)
  return [
    http.get(`${base}/worksheets`, () =>
      HttpResponse.json({ value: mockWorkbook.sheets.map((name) => ({ name })) }),
    ),
    http.get(`${base}/worksheets/:sheet/usedRange(valuesOnly=true)`, ({ params }) => {
      const sheet = decodeURIComponent(String(params.sheet))
      const values = mockWorkbook.rows.map((r) => [r.taskId, r.effort, r.description])
      return HttpResponse.json({
        values,
        address: `${sheet}!A1:C${mockWorkbook.rows.length}`,
      })
    }),
    http.patch(`${base}/worksheets/:sheet/range(address=:cell)`, async ({ request, params }) => {
      const rawBody = await request.json()
      if (!isWriteBody(rawBody)) return HttpResponse.json({}, { status: 400 })
      const { values } = rawBody
      const cellParam = decodeURIComponent(String(params.cell)).replace(/'/g, '')
      const rowMatch = /B(\d+)/.exec(cellParam)
      if (rowMatch) {
        const rowIdx = parseInt(rowMatch[1], 10) - 1
        if (mockWorkbook.rows[rowIdx]) {
          mockWorkbook.rows[rowIdx].effort = values[0][0]
        }
      }
      return HttpResponse.json({})
    }),
  ]
}

export const handlers: HttpHandler[] = []
