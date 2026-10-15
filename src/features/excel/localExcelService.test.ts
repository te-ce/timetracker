// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { IDBFactory } from 'fake-indexeddb'

// The default directory provider reads the real folder-handle-store, which uses the global indexedDB.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

import {
  listLocalXlsxFiles,
  listLocalSheets,
  listLocalRows,
  writeLocalSprintData,
  archiveLocalSprintData,
} from './localExcelService'
import { SheetExistsError } from './excelService'

type CellValue = ExcelJS.CellValue
type SheetSpec = { name: string; rows: CellValue[][] }

async function buildXlsx(sheets: SheetSpec[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  for (const { name, rows } of sheets) {
    const ws = wb.addWorksheet(name)
    for (const row of rows) ws.addRow(row)
  }
  const out: unknown = await wb.xlsx.writeBuffer()
  if (out instanceof Uint8Array) return Uint8Array.from(out)
  throw new Error('unexpected writeBuffer result')
}

async function readXlsx(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(Uint8Array.from(bytes).buffer)
  return wb
}

interface InMemoryFile {
  handle: FileSystemFileHandle
  bytes: () => Uint8Array
  writes: () => number
}

function makeFile(initial: Uint8Array): InMemoryFile {
  let content = initial
  let writes = 0
  const handle = {
    getFile: () => Promise.resolve({ arrayBuffer: () => Promise.resolve(Uint8Array.from(content).buffer) }),
    createWritable: () =>
      Promise.resolve({
        write: (data: ArrayBuffer | Uint8Array) => {
          content = data instanceof Uint8Array ? Uint8Array.from(data) : new Uint8Array(data)
          writes++
          return Promise.resolve()
        },
        close: () => Promise.resolve(),
      }),
  } as unknown as FileSystemFileHandle
  return { handle, bytes: () => content, writes: () => writes }
}

function makeDir(files: Record<string, FileSystemFileHandle>): () => Promise<FileSystemDirectoryHandle> {
  const dir = {
    entries() {
      return (function* () {
        for (const [name, handle] of Object.entries(files)) yield [name, handle] as [string, FileSystemFileHandle]
      })()
    },
    getFileHandle: (name: string) => {
      const found = files[name]
      return found ? Promise.resolve(found) : Promise.reject(new DOMException('Not found', 'NotFoundError'))
    },
  } as unknown as FileSystemDirectoryHandle
  return () => Promise.resolve(dir)
}

async function setup(sheets: SheetSpec[], filename = 'sprint.xlsx') {
  const file = makeFile(await buildXlsx(sheets))
  return { file, dir: makeDir({ [filename]: file.handle }) }
}

describe('listLocalXlsxFiles', () => {
  const stub = {} as unknown as FileSystemFileHandle

  it('returns only .xlsx files sorted alphabetically', async () => {
    const dir = makeDir({ 'b.xlsx': stub, 'a.xlsx': stub, 'readme.txt': stub, 'c.xlsx': stub })
    expect(await listLocalXlsxFiles(dir)).toEqual(['a.xlsx', 'b.xlsx', 'c.xlsx'])
  })

  it('returns empty list when no xlsx files exist', async () => {
    const dir = makeDir({ 'readme.txt': stub, 'data.csv': stub })
    expect(await listLocalXlsxFiles(dir)).toEqual([])
  })

  it('throws when no folder is configured', async () => {
    await expect(listLocalXlsxFiles()).rejects.toThrow('No local folder configured')
  })
})

describe('listLocalRows', () => {
  it('reads taskId from col1 and description from col3', async () => {
    const { dir } = await setup([
      {
        name: 'Sheet1',
        rows: [
          ['TASK-1', null, 'Fix login bug'],
          ['TASK-2', null, 'Update dashboard'],
        ],
      },
    ])
    expect(await listLocalRows('sprint.xlsx', 'Sheet1', dir)).toEqual([
      { taskId: 'TASK-1', description: 'Fix login bug', rowNumber: 1 },
      { taskId: 'TASK-2', description: 'Update dashboard', rowNumber: 2 },
    ])
  })

  it('skips rows with no taskId in col1', async () => {
    const { dir } = await setup([
      {
        name: 'Sheet1',
        rows: [
          ['TASK-1', null, 'Valid'],
          [null, null, 'No taskId'],
          ['', null, 'Empty'],
        ],
      },
    ])
    const rows = await listLocalRows('sprint.xlsx', 'Sheet1', dir)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.taskId).toBe('TASK-1')
  })

  it('accepts numeric task IDs and keeps real row numbers', async () => {
    const { dir } = await setup([
      {
        name: 'Sheet1',
        rows: [
          [null, null, null],
          [4711, null, 'Numeric'],
        ],
      },
    ])
    expect(await listLocalRows('sprint.xlsx', 'Sheet1', dir)).toEqual([
      { taskId: '4711', description: 'Numeric', rowNumber: 2 },
    ])
  })

  it('reads rich-text and hyperlink cells through cell.text', async () => {
    const { dir } = await setup([
      {
        name: 'Sheet1',
        rows: [
          [{ richText: [{ text: 'TASK' }, { text: '-1' }] }, null, null],
          [{ text: ' TASK-2 ', hyperlink: 'https://x.example/2' }, null, null],
        ],
      },
    ])
    const rows = await listLocalRows('sprint.xlsx', 'Sheet1', dir)
    expect(rows.map((r) => r.taskId)).toEqual(['TASK-1', 'TASK-2'])
  })

  it('returns empty array when sheet does not exist', async () => {
    const { dir } = await setup([{ name: 'Sheet1', rows: [['TASK-1', null, 'row']] }])
    expect(await listLocalRows('sprint.xlsx', 'WrongSheet', dir)).toEqual([])
  })

  it('trims whitespace from taskId and description', async () => {
    const { dir } = await setup([{ name: 'Sheet1', rows: [['  TASK-1  ', null, '  Some task  ']] }])
    const rows = await listLocalRows('sprint.xlsx', 'Sheet1', dir)
    expect(rows[0]).toEqual({ taskId: 'TASK-1', description: 'Some task', rowNumber: 1 })
  })
})

describe('writeLocalSprintData', () => {
  async function hoursColumn(file: InMemoryFile, sheet = 'Sheet1'): Promise<(CellValue | undefined)[]> {
    const ws = (await readXlsx(file.bytes())).getWorksheet(sheet)
    const out: (CellValue | undefined)[] = []
    ws?.eachRow({ includeEmpty: true }, (row) => {
      const v = row.getCell(2).value
      out.push(v === null ? undefined : v)
    })
    return out
  }

  it('writes hours to the correct row in the sheet', async () => {
    const { file, dir } = await setup([
      {
        name: 'Sheet1',
        rows: [
          ['TASK-1', null, 'Fix bug'],
          ['TASK-2', null, 'Feature'],
        ],
      },
    ])
    await writeLocalSprintData(
      'sprint.xlsx',
      'Sheet1',
      { _COREMEDIA: 'TASK-1', _SUPPORT: 'TASK-2' },
      { _COREMEDIA: 12, _SUPPORT: 3 },
      dir,
    )
    expect(await hoursColumn(file)).toEqual([12, 3])
  })

  it('writes to numeric task ID rows', async () => {
    const { file, dir } = await setup([{ name: 'Sheet1', rows: [[4711, null, 'n']] }])
    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _A: '4711' }, { _A: 2 }, dir)
    expect(await hoursColumn(file)).toEqual([2])
  })

  it('writes 0 for categories not in hoursPerCategory', async () => {
    const { file, dir } = await setup([{ name: 'Sheet1', rows: [['TASK-1', null, 'Fix bug']] }])
    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _COREMEDIA: 'TASK-1' }, {}, dir)
    expect(await hoursColumn(file)).toEqual([0])
  })

  it('skips categories whose taskId is not found in the sheet', async () => {
    const { file, dir } = await setup([{ name: 'Sheet1', rows: [['TASK-1', null, 'Fix bug']] }])
    await expect(
      writeLocalSprintData('sprint.xlsx', 'Sheet1', { _MISSING: 'TASK-99' }, { _MISSING: 5 }, dir),
    ).resolves.toBeUndefined()
    expect(await hoursColumn(file)).toEqual([undefined])
  })

  it('writes the workbook to the file handle', async () => {
    const { file, dir } = await setup([{ name: 'Sheet1', rows: [['TASK-1', null, 'Fix bug']] }])
    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _COREMEDIA: 'TASK-1' }, { _COREMEDIA: 4 }, dir)
    expect(file.writes()).toBe(1)
  })

  it('throws when sheet not found', async () => {
    const { dir } = await setup([{ name: 'Sheet1', rows: [] }])
    await expect(writeLocalSprintData('sprint.xlsx', 'WrongSheet', {}, {}, dir)).rejects.toThrow(
      '"WrongSheet" not found',
    )
  })

  it('skips rows where col1 is null when building the row map', async () => {
    const { file, dir } = await setup([
      {
        name: 'Sheet1',
        rows: [
          [null, null, null],
          ['TASK-1', null, null],
        ],
      },
    ])
    await expect(
      writeLocalSprintData('sprint.xlsx', 'Sheet1', { _CAT: 'TASK-1' }, { _CAT: 5 }, dir),
    ).resolves.toBeUndefined()
    expect(await hoursColumn(file)).toEqual([undefined, 5])
  })

  it('trims whitespace from col1 when building task ID row map', async () => {
    const { file, dir } = await setup([{ name: 'Sheet1', rows: [['  TASK-1  ', null, null]] }])
    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _CAT: 'TASK-1' }, { _CAT: 7 }, dir)
    expect(await hoursColumn(file)).toEqual([7])
  })

  it('throws when writeBuffer returns an unexpected type', async () => {
    const { dir } = await setup([{ name: 'Sheet1', rows: [['TASK-1', null, null]] }])
    const xlsxPrototype = Object.getPrototypeOf(new ExcelJS.Workbook().xlsx) as ExcelJS.Xlsx
    vi.spyOn(xlsxPrototype, 'writeBuffer').mockResolvedValueOnce('not-a-buffer' as never)

    await expect(writeLocalSprintData('sprint.xlsx', 'Sheet1', {}, {}, dir)).rejects.toThrow(
      'writeBuffer returned unexpected type',
    )
  })
})

describe('archiveLocalSprintData', () => {
  const rowsOf = async (file: InMemoryFile, sheet: string) => {
    const out: CellValue[][] = []
    ;(await readXlsx(file.bytes())).getWorksheet(sheet)?.eachRow((row) => {
      out.push([row.getCell(1).value, row.getCell(2).value])
    })
    return out
  }
  const namesOf = async (file: InMemoryFile) => (await readXlsx(file.bytes())).worksheets.map((w) => w.name)

  it('throws SheetExistsError when the sheet exists and overwrite is false', async () => {
    const { file, dir } = await setup([{ name: 'Sprint 3', rows: [['OLD', 1]] }])
    await expect(
      archiveLocalSprintData('sprint.xlsx', 'Sprint 3', { _CAT: 'TASK-1' }, { _CAT: 5 }, false, dir),
    ).rejects.toBeInstanceOf(SheetExistsError)
    expect(file.writes()).toBe(0)
    expect(await rowsOf(file, 'Sprint 3')).toEqual([['OLD', 1]])
  })

  it('removes the existing sheet then re-adds it when overwrite is true', async () => {
    const { file, dir } = await setup([{ name: 'Sprint 3', rows: [['OLD', 1]] }])
    await archiveLocalSprintData('sprint.xlsx', 'Sprint 3', { _CAT: 'TASK-1' }, { _CAT: 5 }, true, dir)

    expect(file.writes()).toBe(1)
    expect(await namesOf(file)).toEqual(['Sprint 3'])
    expect(await rowsOf(file, 'Sprint 3')).toEqual([['TASK-1', 5]])
  })

  it('adds a new sheet without removing when it does not exist', async () => {
    const { file, dir } = await setup([{ name: 'Sheet1', rows: [['KEEP', 1]] }])
    await archiveLocalSprintData('sprint.xlsx', 'Sprint 9', { _CAT: 'TASK-1' }, { _CAT: 5 }, false, dir)

    expect(await namesOf(file)).toEqual(['Sheet1', 'Sprint 9'])
    expect(await rowsOf(file, 'Sheet1')).toEqual([['KEEP', 1]])
    expect(await rowsOf(file, 'Sprint 9')).toEqual([['TASK-1', 5]])
  })
})

describe('listLocalSheets', () => {
  it('returns worksheet names from the workbook', async () => {
    const { dir } = await setup([{ name: 'Sprint 42', rows: [] }], 'report.xlsx')
    expect(await listLocalSheets('report.xlsx', dir)).toEqual(['Sprint 42'])
  })

  it('throws when no folder is configured', async () => {
    await expect(listLocalSheets('report.xlsx')).rejects.toThrow('No local folder configured')
  })
})
