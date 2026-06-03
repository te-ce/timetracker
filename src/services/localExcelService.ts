import ExcelJS from 'exceljs'
import type { ExcelRow } from './excelService'
import { loadHandle, loadExcelHandle, verifyPermission } from '../storage/folder-handle-store'

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

  const taskIdToRow = new Map<string, number>()
  ws.eachRow((row, rowNumber) => {
    const col1 = row.getCell(1).value
    if (typeof col1 === 'string' && col1.trim()) {
      taskIdToRow.set(col1.trim(), rowNumber)
    }
  })

  for (const [category, taskId] of Object.entries(mapping)) {
    const rowNumber = taskIdToRow.get(taskId)
    if (rowNumber === undefined) continue
    ws.getRow(rowNumber).getCell(2).value = hoursPerCategory[category] ?? 0
  }

  const rawOutput: unknown = await wb.xlsx.writeBuffer()
  if (!(rawOutput instanceof ArrayBuffer) && !(rawOutput instanceof Uint8Array)) {
    throw new Error('writeBuffer returned unexpected type')
  }
  const writable = await fileHandle.createWritable()
  await writable.write(rawOutput)
  await writable.close()
}
