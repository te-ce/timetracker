import ExcelJS from 'exceljs'
import { SheetExistsError } from './excelService'
import type { ExcelRow } from './excelService'
import { buildWritePlan, buildArchiveRows } from './exportPlan'
import { loadHandle, loadExcelHandle, verifyPermission } from '../../infra/storage/folder-handle-store'

async function getDir(): Promise<FileSystemDirectoryHandle> {
  const handle = (await loadExcelHandle()) ?? (await loadHandle())
  if (!handle) throw new Error('No local folder configured.')
  const ok = await verifyPermission(handle)
  if (!ok) throw new Error('Permission denied for local folder.')
  return handle
}

export async function listLocalXlsxFiles(): Promise<string[]> {
  const dir = await getDir()
  const files: string[] = []
  for await (const [name] of dir.entries()) {
    if (name.endsWith('.xlsx')) files.push(name)
  }
  return files.sort()
}

export async function listLocalSheets(filename: string): Promise<string[]> {
  const dir = await getDir()
  const fileHandle = await dir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  return wb.worksheets.map((ws) => ws.name)
}

export async function listLocalRows(filename: string, sheet: string): Promise<ExcelRow[]> {
  const dir = await getDir()
  const fileHandle = await dir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet(sheet)
  if (!ws) return []
  const rows: ExcelRow[] = []
  ws.eachRow((row) => {
    const col1 = row.getCell(1).value
    const col3 = row.getCell(3).value
    const taskId = typeof col1 === 'string' ? col1.trim() : null
    if (taskId) {
      rows.push({
        taskId,
        description: typeof col3 === 'string' ? col3.trim() : '',
      })
    }
  })
  return rows
}

export async function writeLocalSprintData(
  filename: string,
  sheet: string,
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
): Promise<void> {
  const dir = await getDir()
  const fileHandle = await dir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet(sheet)
  if (!ws) throw new Error(`Sheet "${sheet}" not found in ${filename}`)

  const rows: { taskId: string; rowNumber: number }[] = []
  ws.eachRow((row, rowNumber) => {
    const col1 = row.getCell(1).value
    if (typeof col1 === 'string' && col1.trim()) {
      rows.push({ taskId: col1.trim(), rowNumber })
    }
  })

  const plan = buildWritePlan(rows, mapping, hoursPerCategory)
  for (const { rowNumber, hours } of plan) {
    ws.getRow(rowNumber).getCell(2).value = hours
  }

  const rawOutput: unknown = await wb.xlsx.writeBuffer()
  if (!(rawOutput instanceof ArrayBuffer) && !(rawOutput instanceof Uint8Array)) {
    throw new Error('writeBuffer returned unexpected type')
  }
  const writable = await fileHandle.createWritable()
  const data: unknown = rawOutput
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  await writable.write(data as ArrayBuffer)
  await writable.close()
}

export async function archiveLocalSprintData(
  filename: string,
  sheetName: string,
  mapping: Record<string, string>,
  hoursPerCategory: Record<string, number>,
  overwrite: boolean,
): Promise<void> {
  const dir = await getDir()
  const fileHandle = await dir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const existing = wb.getWorksheet(sheetName)
  if (existing) {
    if (!overwrite) throw new SheetExistsError(sheetName)
    wb.removeWorksheet(existing.id)
  }
  const ws = wb.addWorksheet(sheetName)
  for (const row of buildArchiveRows(mapping, hoursPerCategory)) {
    ws.addRow(row)
  }

  const rawOutput: unknown = await wb.xlsx.writeBuffer()
  if (!(rawOutput instanceof ArrayBuffer) && !(rawOutput instanceof Uint8Array)) {
    throw new Error('writeBuffer returned unexpected type')
  }
  const writable = await fileHandle.createWritable()
  const data: unknown = rawOutput
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  await writable.write(data as ArrayBuffer)
  await writable.close()
}
