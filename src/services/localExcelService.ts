import * as XLSX from 'xlsx'
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
  const wb = XLSX.read(await file.arrayBuffer())
  return wb.SheetNames
}

export async function listLocalRows(filename: string, sheet: string): Promise<ExcelRow[]> {
  const dir = await getDir()
  const fileHandle = await dir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const wb = XLSX.read(await file.arrayBuffer())
  const ws: XLSX.WorkSheet | undefined = wb.SheetNames.includes(sheet) ? wb.Sheets[sheet] : undefined
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
  return rows
    .filter((row) => typeof row[0] === 'string' && String(row[0]).trim() !== '')
    .map((row) => ({
      taskId: String(row[0]).trim(),
      description: typeof row[2] === 'string' ? String(row[2]).trim() : '',
    }))
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
  const wb = XLSX.read(await file.arrayBuffer())
  const ws: XLSX.WorkSheet | undefined = wb.SheetNames.includes(sheet) ? wb.Sheets[sheet] : undefined
  if (!ws) throw new Error(`Sheet "${sheet}" not found in ${filename}`)

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
  const taskIdToRow = new Map<string, number>()
  rows.forEach((row, i) => {
    if (typeof row[0] === 'string' && String(row[0]).trim()) {
      taskIdToRow.set(String(row[0]).trim(), i)
    }
  })

  for (const [category, taskId] of Object.entries(mapping)) {
    const rowIdx = taskIdToRow.get(taskId)
    if (rowIdx === undefined) continue
    const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 1 })
    ws[cellRef] = { t: 'n', v: hoursPerCategory[category] ?? 0 }
  }

  const rawOutput: unknown = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  if (!(rawOutput instanceof Uint8Array)) throw new Error('XLSX.write returned unexpected type')
  const output: Uint8Array = rawOutput
  const writable = await fileHandle.createWritable()
  await writable.write(output as unknown as FileSystemWriteChunkType)
  await writable.close()
}
