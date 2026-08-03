import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RepositoryProvider } from '../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../infra/repositories/in-memory/sprint-export-repository'
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
