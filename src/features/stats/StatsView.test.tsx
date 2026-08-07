import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatsView } from './StatsView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import type { MonthData } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

/** Mon 6th – Wed 8th July 2026, one of them in the office. */
const JULY: MonthData = {
  '2026-07-06': {
    windows: [{ id: 'a', start: '08:00', end: '16:00', category: '_OTHER', subtasks: [] }],
    location: 'Office',
  },
  '2026-07-07': { windows: [{ id: 'b', start: '07:15', end: '17:45', category: '_COREMEDIA', subtasks: [] }] },
  '2026-07-08': { windows: [{ id: 'c', start: '09:00', end: '15:00', category: '_OTHER', subtasks: [] }] },
}

function makeWrapper(months: Record<string, MonthData>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: new InMemoryMonthRepository(months),
    configRepo: new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

describe('StatsView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 6, 8, 18, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invites the user to track something when there is no data', async () => {
    render(<StatsView />, { wrapper: makeWrapper({}) })
    expect(await screen.findByText(/nothing to crunch yet/i)).toBeInTheDocument()
  })

  it('shows the all-time totals for the stored months', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const headline = await screen.findByRole('region', { name: /all-time statistics/i })
    expect(headline.textContent).toContain('24.50h')
    expect(headline.textContent).toContain('3 days across 1 month')
  })

  it('shows the all-time balance against the target', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const headline = await screen.findByRole('region', { name: /all-time statistics/i })
    expect(headline.textContent).toContain('+0.50h')
  })

  it('shows the longest workday streak as a general stat', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const headline = await screen.findByRole('region', { name: /all-time statistics/i })
    expect(headline.textContent).toContain('Longest workday streak')
    expect(headline.textContent).toContain('broken by a vacation or sick day')
  })

  it('puts the usual start and end on the average-day card', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const headline = await screen.findByRole('region', { name: /all-time statistics/i })
    expect(headline.textContent).toContain('Usually 08:05 → 16:15')
  })

  it('breaks the hours down by weekday, category and month', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const weekdays = await screen.findByRole('region', { name: /hours by weekday/i })
    expect(weekdays.textContent).toContain('Tuesday')
    expect(weekdays.textContent).toContain('10.50h')

    const categories = screen.getByRole('region', { name: /hours by category/i })
    expect(categories.textContent).toContain('_OTHER')
    expect(categories.textContent).toContain('57%')

    const monthsRegion = screen.getByRole('region', { name: /hours by month/i })
    expect(monthsRegion.textContent).toContain('July 2026')
    expect(monthsRegion.textContent).toContain('% office')
    expect(monthsRegion.textContent).toContain('_OTHER')
  })

  it('shows the records row with office share, day extremes and break figures', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const records = await screen.findByRole('region', { name: 'Records' })
    expect(records.textContent).toContain('Office share')
    expect(records.textContent).toContain('33%')
    expect(records.textContent).toContain('1 of 3 tracked days')
    expect(records.textContent).toContain('Longest day')
    expect(records.textContent).toContain('10.50h')
    expect(records.textContent).toContain('Shortest day')
    expect(records.textContent).toContain('6.00h')
  })

  it('shows when the typical break usually falls', async () => {
    const withLunch: MonthData = {
      '2026-07-06': {
        windows: [
          { id: 'a', start: '08:00', end: '12:00', category: '_OTHER', subtasks: [] },
          { id: 'b', start: '12:40', end: '17:00', category: '_OTHER', subtasks: [] },
        ],
      },
      '2026-07-07': {
        windows: [
          { id: 'c', start: '08:00', end: '12:20', category: '_OTHER', subtasks: [] },
          { id: 'd', start: '13:00', end: '17:00', category: '_OTHER', subtasks: [] },
        ],
      },
    }
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': withLunch }) })

    const records = await screen.findByRole('region', { name: 'Records' })
    expect(records.textContent).toContain('Typical break')
    expect(records.textContent).toContain('Usually 12:10 → 12:50')
  })

  it('lists fun facts derived from the tracked data', async () => {
    render(<StatsView />, { wrapper: makeWrapper({ '2026-07': JULY }) })

    const facts = await screen.findByRole('region', { name: /fun facts/i })
    expect(facts.textContent).toContain('Earliest start ever: 07:15')
    expect(facts.textContent).toContain('Latest finish ever: 17:45')
    expect(facts.textContent).toContain('Tuesday is your heaviest day')
    expect(facts.textContent).toContain('to go until 100 hours tracked')
  })

  it('lists the newest month first so recent history reads at the top', async () => {
    const june: MonthData = {
      '2026-06-30': { windows: [{ id: 'j', start: '08:00', end: '12:00', category: '_OTHER', subtasks: [] }] },
    }
    render(<StatsView />, { wrapper: makeWrapper({ '2026-06': june, '2026-07': JULY }) })

    const monthsRegion = await screen.findByRole('region', { name: /hours by month/i })
    const labels = [...monthsRegion.querySelectorAll('li')].map((li) => li.textContent)
    expect(labels[0]).toContain('July 2026')
    expect(labels[1]).toContain('June 2026')
  })
})
