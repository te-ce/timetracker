import type { ExcelRow } from './excelService'
import { listSheets, listRows, writeSprintData } from './excelService'
import { listLocalSheets, listLocalRows, writeLocalSprintData } from './localExcelService'

export type { ExcelRow }

export interface WorkbookService {
  listSheets(): Promise<string[]>
  listRows(sheet: string): Promise<ExcelRow[]>
  writeSprintData(
    sheet: string,
    mapping: Record<string, string>,
    hoursPerCategory: Record<string, number>,
  ): Promise<void>
}

export class GraphApiWorkbookService implements WorkbookService {
  private readonly sharepointUrl: string
  private readonly getToken: () => Promise<string>
  constructor(sharepointUrl: string, getToken: () => Promise<string>) {
    this.sharepointUrl = sharepointUrl
    this.getToken = getToken
  }

  async listSheets(): Promise<string[]> {
    return listSheets(this.sharepointUrl, await this.getToken())
  }

  async listRows(sheet: string): Promise<ExcelRow[]> {
    return listRows(this.sharepointUrl, sheet, await this.getToken())
  }

  async writeSprintData(
    sheet: string,
    mapping: Record<string, string>,
    hoursPerCategory: Record<string, number>,
  ): Promise<void> {
    return writeSprintData(this.sharepointUrl, sheet, mapping, hoursPerCategory, await this.getToken())
  }
}

export class LocalFolderWorkbookService implements WorkbookService {
  private readonly filename: string
  constructor(filename: string) {
    this.filename = filename
  }

  listSheets(): Promise<string[]> {
    return listLocalSheets(this.filename)
  }

  listRows(sheet: string): Promise<ExcelRow[]> {
    return listLocalRows(this.filename, sheet)
  }

  writeSprintData(
    sheet: string,
    mapping: Record<string, string>,
    hoursPerCategory: Record<string, number>,
  ): Promise<void> {
    return writeLocalSprintData(this.filename, sheet, mapping, hoursPerCategory)
  }
}
