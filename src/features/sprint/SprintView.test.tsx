import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SprintView } from './SprintView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { AppConfig, DatedTimeEntry, MonthData } from '../../infra/repositories/types'
import { SheetExistsError } from '../excel'
import type { ExcelRow, WorkbookService } from '../excel/workbookService'

class PendingMonthRepository extends InMemoryMonthRepository {
  override findEntriesByDateRange(): Promise<DatedTimeEntry[]> {
    return new Promise(() => undefined)
  }
}

class FailingMonthRepository extends InMemoryMonthRepository {
  override findEntriesByDateRange(): Promise<DatedTimeEntry[]> {
    return Promise.reject(new Error('boom'))
  }
}

interface WriteCall {
  sheet: string
  mapping: Record<string, string>
  hours: Record<string, number>
}

interface ArchiveCall {
  sheetName: string
  hours: Record<string, number>
  overwrite: boolean
}

class FakeWorkbookService implements WorkbookService {
  writes: WriteCall[] = []
  archives: ArchiveCall[] = []
  archiveFailure: Error | null = null

  listSheets(): Promise<string[]> {
    return Promise.resolve([])
  }

  listRows(): Promise<ExcelRow[]> {
    return Promise.resolve([])
  }

  writeSprintData(sheet: string, mapping: Record<string, string>, hours: Record<string, number>): Promise<void> {
    this.writes.push({ sheet, mapping, hours })
    return Promise.resolve()
  }

  archiveSprintSheet(
    sheetName: string,
    _mapping: Record<string, string>,
    hours: Record<string, number>,
    overwrite: boolean,
  ): Promise<void> {
    this.archives.push({ sheetName, hours, overwrite })
    if (this.archiveFailure) return Promise.reject(this.archiveFailure)
    return Promise.resolve()
  }
}

interface SetupOptions {
  config?: AppConfig
  monthData?: Record<string, MonthData>
  monthRepo?: InMemoryMonthRepository
}

function setup({ config = DEFAULT_APP_CONFIG, monthData = {}, monthRepo }: SetupOptions = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const month = monthRepo ?? new InMemoryMonthRepository(monthData)
  const sprintExportRepo = new InMemorySprintExportRepository()
  const repos = {
    monthRepo: month,
    configRepo: new InMemoryConfigRepository(config),
    sprintExportRepo,
    trashRepo: new InMemoryTrashRepository(month),
  }
  const service = new FakeWorkbookService()
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
  render(<SprintView createService={() => service} />, { wrapper: Wrapper })
  return { service, sprintExportRepo }
}

function makeWrapper(config: AppConfig = DEFAULT_APP_CONFIG, monthData: Record<string, MonthData> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const monthRepo = new InMemoryMonthRepository(monthData)
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(config),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

const CONFIG_WITH_SPRINT: AppConfig = {
  ...DEFAULT_APP_CONFIG,
  sprintStartDate: '2026-01-05',
  sprintLengthDays: 14,
}

describe('SprintView', () => {
  describe('when no sprint is configured', () => {
    it('renders the config panel', async () => {
      render(<SprintView />, { wrapper: makeWrapper() })
      expect(await screen.findByLabelText(/start date/i)).toBeInTheDocument()
    })

    it('does not render sprint navigation', async () => {
      render(<SprintView />, { wrapper: makeWrapper() })
      await screen.findByLabelText(/start date/i)
      expect(screen.queryByRole('button', { name: /previous sprint/i })).not.toBeInTheDocument()
    })
  })

  describe('when sprint is configured', () => {
    it('shows sprint heading with sprint number', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(screen.getByText(/sprint \d+/i)).toBeInTheDocument()
      })
    })

    it('shows sprint date range in heading', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`${CONFIG_WITH_SPRINT.sprintStartDate}.*\\d{4}-\\d{2}-\\d{2}`)),
        ).toBeInTheDocument()
      })
    })

    it('shows Prev and Next navigation buttons', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous sprint/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /next sprint/i })).toBeInTheDocument()
      })
    })

    it('Current button is disabled when viewing current sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByRole('button', { name: /previous sprint/i }))
      const currentBtn = screen.getByRole('button', { name: /^current$/i })
      expect(currentBtn).toHaveClass('opacity-40')
    })

    it('navigates to previous sprint when Prev is clicked', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      const initialSprint = screen.getByText(/sprint \d+/i).textContent
      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))

      await waitFor(() => {
        const newSprint = screen.getByText(/sprint \d+/i).textContent
        expect(newSprint).not.toBe(initialSprint)
      })
    })

    it('Current button becomes active after navigating away', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^current$/i })).not.toHaveClass('opacity-40')
      })
    })

    it('Current button resets to current sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      const originalSprint = screen.getByText(/sprint \d+/i).textContent
      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))
      await waitFor(() => {
        const changed = screen.getByText(/sprint \d+/i).textContent
        expect(changed).not.toBe(originalSprint)
      })

      await userEvent.click(screen.getByRole('button', { name: /^current$/i }))
      await waitFor(() => {
        expect(screen.getByText(/sprint \d+/i).textContent).toBe(originalSprint)
      })
    })
  })

  describe('sprint report data', () => {
    // The system date is pinned to 2026-01-10, so Sprint 1 (Jan 5–18) is current
    const CONFIG: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      sprintStartDate: '2026-01-05',
      sprintLengthDays: 14,
      customCategories: [],
    }
    const MONTH_DATA: Record<string, MonthData> = {
      '2026-01': {
        '2026-01-06': {
          windows: [{ id: 'w1', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [] }],
        },
        '2026-01-07': {
          windows: [{ id: 'w2', start: '08:00', end: '10:00', category: '_SUPPORT', subtasks: [] }],
        },
      },
    }

    it('shows category hours from entries within the sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG, MONTH_DATA) })
      await waitFor(() => expect(screen.getByText('3.00h')).toBeInTheDocument())
      expect(screen.getByText('2.00h')).toBeInTheDocument()
    })

    it('shows correct sprint total', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG, MONTH_DATA) })
      await waitFor(() => {
        const totalRow = screen.getByText('Total').closest('tr')
        expect(totalRow?.textContent).toMatch(/5:00/)
        expect(totalRow?.textContent).toMatch(/5\.00h/)
      })
    })

    it('excludes entries outside the sprint date range', async () => {
      const withOutlier: Record<string, MonthData> = {
        '2026-01': {
          ...MONTH_DATA['2026-01'],
          // Jan 19 is outside Sprint 1 (Jan 5–18)
          '2026-01-19': {
            windows: [{ id: 'w-out', start: '09:00', end: '17:00', category: '_LEAVE', subtasks: [] }],
          },
        },
      }
      render(<SprintView />, { wrapper: makeWrapper(CONFIG, withOutlier) })
      await waitFor(() => {
        const totalRow = screen.getByText('Total').closest('tr')
        expect(totalRow?.textContent).toMatch(/5:00/)
        expect(totalRow?.textContent).toMatch(/5\.00h/)
      })
    })

    it('shows 0:00 / 0.00h total when sprint has no entries', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG) })
      await waitFor(() => expect(screen.getByText('Total')).toBeInTheDocument())
      const totalRow = screen.getByText('Total').closest('tr')
      expect(totalRow?.textContent).toMatch(/0:00/)
      expect(totalRow?.textContent).toMatch(/0\.00h/)
    })
  })

  describe('export', () => {
    const EXPORT_CONFIG: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      sprintStartDate: '2026-01-05',
      sprintLengthDays: 14,
      targetSheet: 'Sheet1',
      categoryMapping: { _COREMEDIA: 'T-1' },
      archiveSprintSheet: true,
      localExcelFile: 'time.xlsx',
    }
    const DATA: Record<string, MonthData> = {
      '2026-01': {
        '2026-01-06': {
          windows: [
            { id: 'w1', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [] },
            { id: 'w2', start: '13:00', end: '15:00', category: '_SUPPORT', subtasks: [] },
          ],
        },
      },
    }

    it('lists unmapped categories with their hours and still allows exporting', async () => {
      const { service } = setup({ config: EXPORT_CONFIG, monthData: DATA })
      const banner = await screen.findByText(/not mapped to a task id/i)
      const list = banner.closest('[role="status"]')
      expect(list).toHaveTextContent('_SUPPORT: 2.00h')
      expect(list).not.toHaveTextContent('_COREMEDIA')

      const exportButton = screen.getByRole('button', { name: 'Export' })
      await waitFor(() => expect(exportButton).toBeEnabled())
      await userEvent.click(exportButton)
      await waitFor(() => expect(service.writes).toHaveLength(1))
      expect(service.writes[0]?.hours).toEqual({ _COREMEDIA: 3, _SUPPORT: 2 })
    })

    it('treats an empty mapping value as unmapped', async () => {
      setup({ config: { ...EXPORT_CONFIG, categoryMapping: { _COREMEDIA: 'T-1', _SUPPORT: '' } }, monthData: DATA })
      const banner = await screen.findByText(/not mapped to a task id/i)
      expect(banner.closest('[role="status"]')).toHaveTextContent('_SUPPORT: 2.00h')
    })

    it('shows no banner when every category with hours is mapped', async () => {
      setup({ config: { ...EXPORT_CONFIG, categoryMapping: { _COREMEDIA: 'T-1', _SUPPORT: 'T-2' } }, monthData: DATA })
      await screen.findByText('3.00h')
      expect(screen.queryByText(/not mapped to a task id/i)).not.toBeInTheDocument()
    })

    it('disables Export while sprint hours are loading', async () => {
      const { service } = setup({ config: EXPORT_CONFIG, monthRepo: new PendingMonthRepository() })
      const button = await screen.findByRole('button', { name: 'Export' })
      expect(button).toBeDisabled()
      expect(screen.getByText(/loading sprint hours/i)).toBeInTheDocument()
      await userEvent.click(button)
      expect(service.writes).toHaveLength(0)
    })

    it('disables Export when sprint hours failed to load', async () => {
      const { service } = setup({ config: EXPORT_CONFIG, monthRepo: new FailingMonthRepository() })
      expect(await screen.findByText(/could not load sprint hours/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
      expect(service.writes).toHaveLength(0)
    })

    it('records the sprint boundaries with the export', async () => {
      const { sprintExportRepo } = setup({ config: EXPORT_CONFIG, monthData: DATA })
      const button = await screen.findByRole('button', { name: 'Export' })
      await waitFor(() => expect(button).toBeEnabled())
      await userEvent.click(button)
      await waitFor(async () => {
        const record = await sprintExportRepo.findBySprintIndex(0)
        expect(record).toMatchObject({ status: 'exported', sprintStart: '2026-01-05', sprintEnd: '2026-01-18' })
      })
    })

    it('does not carry the overwrite confirmation over to another sprint', async () => {
      const { service } = setup({ config: EXPORT_CONFIG, monthData: DATA })
      service.archiveFailure = new SheetExistsError('time - 05.01.26 - 18.01.26')
      const button = await screen.findByRole('button', { name: 'Export' })
      await waitFor(() => expect(button).toBeEnabled())
      await userEvent.click(button)
      expect(await screen.findByRole('button', { name: 'Export and overwrite' })).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)

      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))

      expect(await screen.findByRole('button', { name: 'Export' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Export and overwrite' })).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
