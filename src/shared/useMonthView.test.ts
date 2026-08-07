import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RepositoryProvider } from '../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../infra/repositories/in-memory/trash-repository'
import type { WorkPeriod } from '../infra/repositories/types'
import { useMonthView } from './useMonthView'

vi.mock('../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

function period(id: string, start: string, end: string): WorkPeriod {
  return { id, start, end, category: '_COREMEDIA', subtasks: [] }
}

function makeWrapper(monthRepo: InMemoryMonthRepository, configRepo: InMemoryConfigRepository) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo,
    configRepo,
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(RepositoryProvider, { repos, children }),
    )
  }
}

describe('useMonthView', () => {
  it('carries prior month overtime into the new month instead of resetting to zero', async () => {
    // April 2026: one WorkDay tracked, 10h worked against an 8h target → +2h overtime
    const monthRepo = new InMemoryMonthRepository({
      '2026-04': { '2026-04-01': { windows: [period('p1', '08:00', '18:00')] } },
    })
    const configRepo = new InMemoryConfigRepository()
    const { result } = renderHook(() => useMonthView(2026, 5), { wrapper: makeWrapper(monthRepo, configRepo) })

    await waitFor(() => expect(result.current.overtimeToDate.priorOvertime).toBeCloseTo(2))
  })

  it('feeds the month overview from priorMonthsOvertime, not the already-final overtimeToDate.value, so day/week cells do not double-count the current month', async () => {
    // April: +2h. May (the viewed month): one day worked 6h against an 8h target → -2h of its own.
    // Regression guard for the bug where MonthView/TableView seeded the overview's
    // cumulativeBalance from overtimeToDate.value (already includes May's own days),
    // double-counting May once via the seed and again via the day-by-day walk.
    const monthRepo = new InMemoryMonthRepository({
      '2026-04': { '2026-04-01': { windows: [period('p1', '08:00', '18:00')] } },
      '2026-05': { '2026-05-01': { windows: [period('p2', '08:00', '14:00')] } },
    })
    const configRepo = new InMemoryConfigRepository()
    const { result } = renderHook(() => useMonthView(2026, 5), { wrapper: makeWrapper(monthRepo, configRepo) })

    await waitFor(() => expect(result.current.isOvertimeReady).toBe(true))

    expect(result.current.priorMonthsOvertime).toBeCloseTo(2)
    expect(result.current.overview.cumulativeBalance).toBeCloseTo(2)
    const may1 = result.current.overview.weeks.flatMap((w) => w.days).find((d) => d.date === '2026-05-01')
    expect(may1?.overtimeToDate).toBeCloseTo(0) // 2 (carried in) + (6 - 8)
    const tableRow = result.current.rows.find((r) => r.date === '2026-05-01')
    expect(tableRow?.accumulatedOvertime).toBeCloseTo(0)
  })

  it('reports isOvertimeReady as false until the month and carry-over queries resolve, then true, with rows nulled out until then', async () => {
    const monthRepo = new InMemoryMonthRepository({
      '2026-04': { '2026-04-01': { windows: [period('p1', '08:00', '18:00')] } },
      '2026-05': { '2026-05-01': { windows: [period('p2', '08:00', '10:00')] } },
    })
    const configRepo = new InMemoryConfigRepository()
    const { result } = renderHook(() => useMonthView(2026, 5), { wrapper: makeWrapper(monthRepo, configRepo) })

    expect(result.current.isOvertimeReady).toBe(false)
    expect(result.current.rows.find((r) => r.date === '2026-05-01')?.accumulatedOvertime).toBeNull()

    await waitFor(() => expect(result.current.isOvertimeReady).toBe(true))
    expect(result.current.rows.find((r) => r.date === '2026-05-01')?.accumulatedOvertime).not.toBeNull()
  })
})
