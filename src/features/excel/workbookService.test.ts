import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./excelService', () => ({
  listSheets: vi.fn(),
  listRows: vi.fn(),
  writeSprintData: vi.fn(),
  archiveSprintData: vi.fn(),
}))

vi.mock('./localExcelService', () => ({
  listLocalSheets: vi.fn(),
  listLocalRows: vi.fn(),
  writeLocalSprintData: vi.fn(),
  archiveLocalSprintData: vi.fn(),
}))

import * as excelService from './excelService'
import * as localExcelService from './localExcelService'
import { GraphApiWorkbookService, LocalFolderWorkbookService } from './workbookService'
import type { ExcelRow } from './workbookService'

const mockListSheets = vi.mocked(excelService.listSheets)
const mockListRows = vi.mocked(excelService.listRows)
const mockWriteSprintData = vi.mocked(excelService.writeSprintData)
const mockArchiveSprintData = vi.mocked(excelService.archiveSprintData)
const mockListLocalSheets = vi.mocked(localExcelService.listLocalSheets)
const mockListLocalRows = vi.mocked(localExcelService.listLocalRows)
const mockWriteLocalSprintData = vi.mocked(localExcelService.writeLocalSprintData)
const mockArchiveLocalSprintData = vi.mocked(localExcelService.archiveLocalSprintData)

const SP_URL = 'https://company.sharepoint.com/workbook.xlsx'
const TOKEN = 'fake-token'
const ROWS: ExcelRow[] = [{ taskId: 'T-1', description: 'Task A' }]

describe('GraphApiWorkbookService', () => {
  const getToken = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    getToken.mockResolvedValue(TOKEN)
  })

  it('listSheets calls excelService.listSheets with url and token', async () => {
    mockListSheets.mockResolvedValue(['Sheet1', 'Sheet2'])
    const svc = new GraphApiWorkbookService(SP_URL, getToken)
    const result = await svc.listSheets()
    expect(mockListSheets).toHaveBeenCalledWith(SP_URL, TOKEN)
    expect(result).toEqual(['Sheet1', 'Sheet2'])
  })

  it('listRows calls excelService.listRows with url, sheet, and token', async () => {
    mockListRows.mockResolvedValue(ROWS)
    const svc = new GraphApiWorkbookService(SP_URL, getToken)
    const result = await svc.listRows('Sheet1')
    expect(mockListRows).toHaveBeenCalledWith(SP_URL, 'Sheet1', TOKEN)
    expect(result).toEqual(ROWS)
  })

  it('writeSprintData calls excelService.writeSprintData with correct args', async () => {
    mockWriteSprintData.mockResolvedValue(undefined)
    const mapping = { CAT: 'T-1' }
    const hours = { CAT: 8 }
    const svc = new GraphApiWorkbookService(SP_URL, getToken)
    await svc.writeSprintData('Sheet1', mapping, hours)
    expect(mockWriteSprintData).toHaveBeenCalledWith(SP_URL, 'Sheet1', mapping, hours, TOKEN)
  })

  it('archiveSprintSheet calls archiveSprintData with correct args', async () => {
    mockArchiveSprintData.mockResolvedValue(undefined)
    const mapping = { CAT: 'T-1' }
    const hours = { CAT: 8 }
    const svc = new GraphApiWorkbookService(SP_URL, getToken)
    await svc.archiveSprintSheet('Archive Sheet', mapping, hours, false)
    expect(mockArchiveSprintData).toHaveBeenCalledWith(SP_URL, 'Archive Sheet', mapping, hours, TOKEN, false)
  })

  it('propagates token getter rejections', async () => {
    getToken.mockRejectedValue(new Error('token error'))
    const svc = new GraphApiWorkbookService(SP_URL, getToken)
    await expect(svc.listSheets()).rejects.toThrow('token error')
  })
})

describe('LocalFolderWorkbookService', () => {
  const FILENAME = 'time.xlsx'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listSheets calls listLocalSheets with filename', async () => {
    mockListLocalSheets.mockResolvedValue(['Sheet1'])
    const svc = new LocalFolderWorkbookService(FILENAME)
    const result = await svc.listSheets()
    expect(mockListLocalSheets).toHaveBeenCalledWith(FILENAME)
    expect(result).toEqual(['Sheet1'])
  })

  it('listRows calls listLocalRows with filename and sheet', async () => {
    mockListLocalRows.mockResolvedValue(ROWS)
    const svc = new LocalFolderWorkbookService(FILENAME)
    const result = await svc.listRows('Sheet1')
    expect(mockListLocalRows).toHaveBeenCalledWith(FILENAME, 'Sheet1')
    expect(result).toEqual(ROWS)
  })

  it('writeSprintData calls writeLocalSprintData with correct args', async () => {
    mockWriteLocalSprintData.mockResolvedValue(undefined)
    const mapping = { CAT: 'T-1' }
    const hours = { CAT: 8 }
    const svc = new LocalFolderWorkbookService(FILENAME)
    await svc.writeSprintData('Sheet1', mapping, hours)
    expect(mockWriteLocalSprintData).toHaveBeenCalledWith(FILENAME, 'Sheet1', mapping, hours)
  })

  it('archiveSprintSheet calls archiveLocalSprintData with correct args', async () => {
    mockArchiveLocalSprintData.mockResolvedValue(undefined)
    const mapping = { CAT: 'T-1' }
    const hours = { CAT: 8 }
    const svc = new LocalFolderWorkbookService(FILENAME)
    await svc.archiveSprintSheet('Archive Sheet', mapping, hours, true)
    expect(mockArchiveLocalSprintData).toHaveBeenCalledWith(FILENAME, 'Archive Sheet', mapping, hours, true)
  })
})
