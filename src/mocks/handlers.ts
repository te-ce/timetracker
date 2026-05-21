import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'
import { encodeSharesUrl } from '../services/excelService'

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
      const sheet = decodeURIComponent(params.sheet as string)
      const values = mockWorkbook.rows.map((r) => [r.taskId, r.effort, r.description])
      return HttpResponse.json({
        values,
        address: `${sheet}!A1:C${mockWorkbook.rows.length}`,
      })
    }),
    http.patch(`${base}/worksheets/:sheet/range(address=:cell)`, async ({ request, params }) => {
      const body = (await request.json()) as { values: number[][] }
      const cellParam = decodeURIComponent(params.cell as string).replace(/'/g, '')
      const rowMatch = /B(\d+)/.exec(cellParam)
      if (rowMatch) {
        const rowIdx = parseInt(rowMatch[1], 10) - 1
        if (mockWorkbook.rows[rowIdx]) {
          mockWorkbook.rows[rowIdx].effort = body.values[0][0]
        }
      }
      return HttpResponse.json({})
    }),
  ]
}

export const handlers: HttpHandler[] = []
