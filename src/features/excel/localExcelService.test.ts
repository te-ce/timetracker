// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../infra/storage/folder-handle-store', () => ({
  loadHandle: vi.fn().mockResolvedValue(null),
  loadExcelHandle: vi.fn(),
  verifyPermission: vi.fn().mockResolvedValue(true),
  saveHandle: vi.fn(),
}))

// ── ExcelJS mock ─────────────────────────────────────────────────────────────
// vi.mock factories are hoisted; any shared state they close over must be
// created with vi.hoisted so it exists before the factory runs.
// We also avoid arrow-function constructors (not newable in strict mode).

interface MockCell {
  value: string | number | null
}
interface MockRow {
  getCell(n: number): MockCell
}
type EachRowCallback = (row: MockRow, rowNumber: number) => void

const mockState = vi.hoisted(() => {
  const rows: MockRow[] = []
  const writtenCells: Map<string, number | null> = new Map()
  let sheetName = 'Sheet1'
  let writeBufferResult: unknown = new Uint8Array([0])
  return {
    rows,
    writtenCells,
    get sheetName() {
      return sheetName
    },
    set sheetName(v: string) {
      sheetName = v
    },
    get writeBufferResult() {
      return writeBufferResult
    },
    set writeBufferResult(v: unknown) {
      writeBufferResult = v
    },
  }
})

vi.mock('exceljs', () => {
  class MockWorkbook {
    xlsx = {
      load: vi.fn().mockResolvedValue(undefined),
      writeBuffer: vi.fn().mockImplementation(() => Promise.resolve(mockState.writeBufferResult)),
    }
    get worksheets() {
      return [{ name: mockState.sheetName }]
    }
    getWorksheet(name: string) {
      if (name !== mockState.sheetName) return undefined
      const state = mockState
      return {
        name: mockState.sheetName,
        eachRow(cb: EachRowCallback) {
          state.rows.forEach((row, idx) => cb(row, idx + 1))
        },
        getRow(rowNumber: number) {
          return {
            getCell(col: number) {
              const key = `${rowNumber}:${col}`
              return {
                get value() {
                  return state.writtenCells.get(key) ?? null
                },
                set value(v: number | null) {
                  state.writtenCells.set(key, v)
                },
              }
            },
          }
        },
      }
    }
    addWorksheet() {
      return { addRow: vi.fn() }
    }
  }
  return { default: { Workbook: MockWorkbook } }
})

import { loadExcelHandle } from '../../infra/storage/folder-handle-store'
import { listLocalXlsxFiles, listLocalSheets, listLocalRows, writeLocalSprintData } from './localExcelService'

function makeRow(col1: string | null, col2: string | null, col3: string | null): MockRow {
  return {
    getCell(n: number): MockCell {
      const values = [null, col1, col2, col3]
      return { value: values[n] ?? null }
    },
  }
}

function makeDirWithEntries(names: string[]): FileSystemDirectoryHandle {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    entries() {
      return (function* () {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        for (const name of names) yield [name, {}] as [string, object]
      })()
    },
  } as unknown as FileSystemDirectoryHandle
}

function makeReadonlyFileHandle(): FileSystemFileHandle {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    getFile: () => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
  } as unknown as FileSystemFileHandle
}

function makeWritableFileHandle(): { handle: FileSystemFileHandle; didWrite: () => boolean } {
  let wrote = false
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const handle: FileSystemFileHandle = {
    getFile: () => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
    createWritable: () =>
      Promise.resolve({
        write: () => {
          wrote = true
          return Promise.resolve()
        },
        close: () => Promise.resolve(),
      }),
  } as unknown as FileSystemFileHandle
  return { handle, didWrite: () => wrote }
}

function makeDirWithFile(filename: string, fileHandle: FileSystemFileHandle): FileSystemDirectoryHandle {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    getFileHandle: (name: string) => {
      if (name === filename) return Promise.resolve(fileHandle)
      return Promise.reject(new DOMException('Not found', 'NotFoundError'))
    },
  } as unknown as FileSystemDirectoryHandle
}

beforeEach(() => {
  vi.mocked(loadExcelHandle).mockResolvedValue(null)
  mockState.rows.length = 0
  mockState.sheetName = 'Sheet1'
  mockState.writtenCells.clear()
  mockState.writeBufferResult = new Uint8Array([0])
})

describe('listLocalXlsxFiles', () => {
  it('returns only .xlsx files sorted alphabetically', async () => {
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithEntries(['b.xlsx', 'a.xlsx', 'readme.txt', 'c.xlsx']))
    expect(await listLocalXlsxFiles()).toEqual(['a.xlsx', 'b.xlsx', 'c.xlsx'])
  })

  it('returns empty list when no xlsx files exist', async () => {
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithEntries(['readme.txt', 'data.csv']))
    expect(await listLocalXlsxFiles()).toEqual([])
  })

  it('throws when no folder is configured', async () => {
    await expect(listLocalXlsxFiles()).rejects.toThrow('No local folder configured')
  })
})

describe('listLocalRows', () => {
  it('reads taskId from col1 and description from col3', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'Fix login bug'), makeRow('TASK-2', null, 'Update dashboard'))
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', makeReadonlyFileHandle()))

    const rows = await listLocalRows('sprint.xlsx', 'Sheet1')
    expect(rows).toEqual([
      { taskId: 'TASK-1', description: 'Fix login bug' },
      { taskId: 'TASK-2', description: 'Update dashboard' },
    ])
  })

  it('skips rows with no taskId in col1', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'Valid'), makeRow(null, null, 'No taskId'), makeRow('', null, 'Empty'))
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', makeReadonlyFileHandle()))

    const rows = await listLocalRows('sprint.xlsx', 'Sheet1')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.taskId).toBe('TASK-1')
  })

  it('returns empty array when sheet does not exist', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'row'))
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', makeReadonlyFileHandle()))

    const rows = await listLocalRows('sprint.xlsx', 'WrongSheet')
    expect(rows).toEqual([])
  })

  it('trims whitespace from taskId and description', async () => {
    mockState.rows.push(makeRow('  TASK-1  ', null, '  Some task  '))
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', makeReadonlyFileHandle()))

    const rows = await listLocalRows('sprint.xlsx', 'Sheet1')
    expect(rows[0]).toEqual({ taskId: 'TASK-1', description: 'Some task' })
  })
})

describe('writeLocalSprintData', () => {
  it('writes hours to the correct row in the sheet', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'Fix bug'), makeRow('TASK-2', null, 'Feature'))
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await writeLocalSprintData(
      'sprint.xlsx',
      'Sheet1',
      { _COREMEDIA: 'TASK-1', _SUPPORT: 'TASK-2' },
      { _COREMEDIA: 12, _SUPPORT: 3 },
    )

    expect(mockState.writtenCells.get('1:2')).toBe(12)
    expect(mockState.writtenCells.get('2:2')).toBe(3)
  })

  it('writes 0 for categories not in hoursPerCategory', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'Fix bug'))
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _COREMEDIA: 'TASK-1' }, {})

    expect(mockState.writtenCells.get('1:2')).toBe(0)
  })

  it('skips categories whose taskId is not found in the sheet', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'Fix bug'))
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await expect(
      writeLocalSprintData('sprint.xlsx', 'Sheet1', { _MISSING: 'TASK-99' }, { _MISSING: 5 }),
    ).resolves.toBeUndefined()
    expect(mockState.writtenCells.size).toBe(0)
  })

  it('writes the workbook to the file handle', async () => {
    mockState.rows.push(makeRow('TASK-1', null, 'Fix bug'))
    const { handle, didWrite } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _COREMEDIA: 'TASK-1' }, { _COREMEDIA: 4 })

    expect(didWrite()).toBe(true)
  })

  it('throws when sheet not found', async () => {
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await expect(writeLocalSprintData('sprint.xlsx', 'WrongSheet', {}, {})).rejects.toThrow('"WrongSheet" not found')
  })

  it('skips rows where col1 is null when building the row map', async () => {
    mockState.rows.push(makeRow(null, null, null), makeRow('TASK-1', null, null))
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await expect(
      writeLocalSprintData('sprint.xlsx', 'Sheet1', { _CAT: 'TASK-1' }, { _CAT: 5 }),
    ).resolves.toBeUndefined()
    expect(mockState.writtenCells.get('2:2')).toBe(5)
  })

  it('trims whitespace from col1 when building task ID row map', async () => {
    mockState.rows.push(makeRow('  TASK-1  ', null, null))
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await writeLocalSprintData('sprint.xlsx', 'Sheet1', { _CAT: 'TASK-1' }, { _CAT: 7 })
    expect(mockState.writtenCells.get('1:2')).toBe(7)
  })

  it('throws when writeBuffer returns an unexpected type', async () => {
    mockState.rows.push(makeRow('TASK-1', null, null))
    mockState.writeBufferResult = 'not-a-buffer'
    const { handle } = makeWritableFileHandle()
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('sprint.xlsx', handle))

    await expect(writeLocalSprintData('sprint.xlsx', 'Sheet1', {}, {})).rejects.toThrow(
      'writeBuffer returned unexpected type',
    )
  })
})

describe('listLocalSheets', () => {
  it('returns worksheet names from the workbook', async () => {
    mockState.sheetName = 'Sprint 42'
    vi.mocked(loadExcelHandle).mockResolvedValue(makeDirWithFile('report.xlsx', makeReadonlyFileHandle()))

    const sheets = await listLocalSheets('report.xlsx')
    expect(sheets).toEqual(['Sprint 42'])
  })

  it('throws when no folder is configured', async () => {
    await expect(listLocalSheets('report.xlsx')).rejects.toThrow('No local folder configured')
  })
})
