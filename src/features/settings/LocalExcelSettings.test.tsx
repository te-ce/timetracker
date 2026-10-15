import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocalExcelSettings } from './LocalExcelSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

import { LocalFolderWorkbookService } from '../excel/workbookService'
import { resetFolderHandleDb } from '../../test/folderHandle'

const defaultConfig = DEFAULT_APP_CONFIG

function setup(config: Partial<AppConfig> = {}, scanFiles?: () => Promise<string[]>) {
  const repo = new InMemoryConfigRepository({ ...defaultConfig, ...config })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <LocalExcelSettings repository={repo} {...(scanFiles && { scanFiles })} />
    </QueryClientProvider>,
  )
  return { repo }
}

beforeEach(() => {
  vi.restoreAllMocks()
  resetFolderHandleDb()
})

describe('LocalExcelSettings', () => {
  it('renders heading and scan button', async () => {
    setup()
    expect(await screen.findByText('Local Excel Workbook')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /scan folder/i })).toBeInTheDocument()
  })

  it('shows file dropdown after scanning', async () => {
    const scanFiles = () => Promise.resolve(['report.xlsx', 'timesheet.xlsx'])
    setup({}, scanFiles)

    await userEvent.click(await screen.findByRole('button', { name: /scan folder/i }))

    expect(await screen.findByLabelText('Excel workbook file')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'report.xlsx' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'timesheet.xlsx' })).toBeInTheDocument()
  })

  it('saves chosen file and loads its sheets', async () => {
    const scanFiles = () => Promise.resolve(['report.xlsx'])
    vi.spyOn(LocalFolderWorkbookService.prototype, 'listSheets').mockResolvedValue(['Sheet1', 'Sheet2'])
    const { repo } = setup({}, scanFiles)

    await userEvent.click(await screen.findByRole('button', { name: /scan folder/i }))
    const fileSelect = await screen.findByLabelText('Excel workbook file')
    await userEvent.selectOptions(fileSelect, 'report.xlsx')

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.localExcelFile).toBe('report.xlsx')
    })
    expect(await screen.findByLabelText('Target sheet')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sheet1' })).toBeInTheDocument()
  })

  it('saves selected sheet to repository', async () => {
    const scanFiles = () => Promise.resolve(['report.xlsx'])
    vi.spyOn(LocalFolderWorkbookService.prototype, 'listSheets').mockResolvedValue(['Sheet1', 'Sheet2'])
    const { repo } = setup({}, scanFiles)

    await userEvent.click(await screen.findByRole('button', { name: /scan folder/i }))
    const fileSelect = await screen.findByLabelText('Excel workbook file')
    await userEvent.selectOptions(fileSelect, 'report.xlsx')

    const sheetSelect = await screen.findByLabelText('Target sheet')
    await userEvent.selectOptions(sheetSelect, 'Sheet2')

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.targetSheet).toBe('Sheet2')
    })
  })

  it('shows error when scan fails', async () => {
    setup()

    await userEvent.click(await screen.findByRole('button', { name: /scan folder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No local folder configured')
  })

  it('shows existing file and load-sheets button when file already configured', async () => {
    vi.spyOn(LocalFolderWorkbookService.prototype, 'listSheets').mockResolvedValue(['Sprint'])
    setup({ localExcelFile: 'timesheet.xlsx' })

    expect(await screen.findByText(/✓ timesheet.xlsx/)).toBeInTheDocument()
    const loadBtn = await screen.findByRole('button', { name: /load sheets/i })
    await userEvent.click(loadBtn)

    expect(await screen.findByLabelText('Target sheet')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sprint' })).toBeInTheDocument()
  })
})
