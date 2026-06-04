import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkOverview } from './WorkOverview'
import { InMemoryMonthRepository } from '../repositories/in-memory'

vi.mock('./OvertimeBar', () => ({
  OvertimeBar: ({ sollstunden }: { sollstunden: number }) => (
    <div data-testid="overtime-bar" data-sollstunden={sollstunden} />
  ),
}))

vi.mock('./WorkPeriodPanel', () => ({
  WorkPeriodPanel: ({ date }: { date: string }) => <div data-testid="work-period-panel" data-date={date} />,
}))

function setup(overrides: Partial<React.ComponentProps<typeof WorkOverview>> = {}) {
  const repo = new InMemoryMonthRepository({})
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props = {
    date: '2026-06-04',
    windows: [],
    repository: repo,
    autoCategory: null,
    ...overrides,
  }
  render(
    <QueryClientProvider client={qc}>
      <WorkOverview {...props} />
    </QueryClientProvider>,
  )
}

describe('WorkOverview', () => {
  it('always renders WorkPeriodPanel', () => {
    setup()
    expect(screen.getByTestId('work-period-panel')).toBeInTheDocument()
  })

  it('passes date to WorkPeriodPanel', () => {
    setup({ date: '2026-01-15' })
    expect(screen.getByTestId('work-period-panel')).toHaveAttribute('data-date', '2026-01-15')
  })

  it('does not render OvertimeBar when overtime props are absent', () => {
    setup()
    expect(screen.queryByTestId('overtime-bar')).not.toBeInTheDocument()
  })

  it('renders OvertimeBar when all overtime props are provided', () => {
    setup({ sollstunden: 8, priorOvertime: 1, workedToday: 6 })
    expect(screen.getByTestId('overtime-bar')).toBeInTheDocument()
    expect(screen.getByTestId('overtime-bar')).toHaveAttribute('data-sollstunden', '8')
  })

  it('does not render OvertimeBar when only some overtime props are provided', () => {
    setup({ sollstunden: 8, priorOvertime: 1 })
    expect(screen.queryByTestId('overtime-bar')).not.toBeInTheDocument()
  })

  it('renders OvertimeBar above WorkPeriodPanel', () => {
    setup({ sollstunden: 8, priorOvertime: 0, workedToday: 4 })
    const bar = screen.getByTestId('overtime-bar')
    const panel = screen.getByTestId('work-period-panel')
    expect(bar.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
