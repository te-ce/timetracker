import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocalExcelSettings } from './LocalExcelSettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import type { AppConfig } from '../repositories/types'

vi.mock('../services/localExcelService', () => ({
  listLocalXlsxFiles: vi.fn(),
  listLocalSheets: vi.fn(),
}))

import { listLocalXlsxFiles, listLocalSheets } from '../services/localExcelService'

const defaultConfig: AppConfig = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 14,
  sprintStartDate: null,
  customCategories: [],
  sharepointUrl: null,
  targetSheet: null,
  categoryMapping: {},
}

function setup(config: Partial<AppConfig> = {}) {
  const repo = new InMemoryConfigRepository({ ...defaultConfig, ...config })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <LocalExcelSettings repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

beforeEach(() => {
  vi.mocked(listLocalXlsxFiles).mockReset()
  vi.mocked(listLocalSheets).mockReset()
})

describe('LocalExcelSettings', () => {
  it('renders heading and scan button', async () => {
    setup()
    expect(await screen.findByText('Local Excel Workbook')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /scan folder/i })).toBeInTheDocument()
  })

  it('shows file dropdown after scanning', async () => {
    vi.mocked(listLocalXlsxFiles).mockResolvedValue(['report.xlsx', 'timesheet.xlsx'])
    setup()

    await userEvent.click(await screen.findByRole('button', { name: /scan folder/i }))

    expect(await screen.findByLabelText('Excel workbook file')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'report.xlsx' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'timesheet.xlsx' })).toBeInTheDocument()
  })

  it('saves chosen file and loads its sheets', async () => {
    vi.mocked(listLocalXlsxFiles).mockResolvedValue(['report.xlsx'])
    vi.mocked(listLocalSheets).mockResolvedValue(['Sheet1', 'Sheet2'])
    const { repo } = setup()

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
    vi.mocked(listLocalXlsxFiles).mockResolvedValue(['report.xlsx'])
    vi.mocked(listLocalSheets).mockResolvedValue(['Sheet1', 'Sheet2'])
    const { repo } = setup()

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
    vi.mocked(listLocalXlsxFiles).mockRejectedValue(new Error('No folder configured'))
    setup()

    await userEvent.click(await screen.findByRole('button', { name: /scan folder/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No folder configured')
  })

  it('shows existing file and load-sheets button when file already configured', async () => {
    vi.mocked(listLocalSheets).mockResolvedValue(['Sprint'])
    setup({ localExcelFile: 'timesheet.xlsx' })

    expect(await screen.findByText(/✓ timesheet.xlsx/)).toBeInTheDocument()
    const loadBtn = await screen.findByRole('button', { name: /load sheets/i })
    await userEvent.click(loadBtn)

    expect(await screen.findByLabelText('Target sheet')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sprint' })).toBeInTheDocument()
  })
})
