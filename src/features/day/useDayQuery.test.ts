import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import type { AppConfig, ConfigRepository, WorkPeriod } from '../../infra/repositories/types'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { useDayQuery } from './useDayQuery'

/** Resolves `get()` after a delay, to simulate the real cloud config repository still loading. */
class DelayedConfigRepository implements ConfigRepository {
  private config: AppConfig
  private delayMs: number
  constructor(initialConfig: AppConfig, delayMs = 20) {
    this.config = structuredClone(initialConfig)
    this.delayMs = delayMs
  }
  get(): Promise<AppConfig> {
    const config = structuredClone(this.config)
    return new Promise((resolve) => setTimeout(() => resolve(config), this.delayMs))
  }
  save(config: AppConfig): Promise<void> {
    this.config = structuredClone(config)
    return Promise.resolve()
  }
}

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-05-15'

function period(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

function makeWrapper(monthRepo: InMemoryMonthRepository, configRepo: ConfigRepository) {
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

describe('useDayQuery', () => {
  describe('data hydration', () => {
    it('returns empty windows when no month data exists', async () => {
      const monthRepo = new InMemoryMonthRepository({})
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.windows).toEqual([]))
    })

    it('returns windows for the requested date from monthRepo', async () => {
      const wp = period('p1', '09:00', '11:00')
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { [DATE]: { windows: [wp] } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.windows).toHaveLength(1))

      expect(result.current.windows[0]?.id).toBe('p1')
    })

    it('returns config from configRepo', async () => {
      const monthRepo = new InMemoryMonthRepository({})
      // DATE = 2026-05-15 = Friday (JS weekday 5), setting Fri=6h
      const configRepo = new InMemoryConfigRepository({
        ...DEFAULT_APP_CONFIG,
        weekdayHours: [0, 8, 8, 8, 8, 6, 0],
      })
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.config.weekdayHours).toEqual([0, 8, 8, 8, 8, 6, 0]))

      expect(result.current.sollstunden).toBe(6) // Friday target
    })

    it('does not return windows from a different date in the same month', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { '2026-05-20': { windows: [period('other', '09:00', '10:00')] } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.windows).toEqual([]))
    })
  })

  describe('config defaults', () => {
    it('uses DEFAULT_APP_CONFIG weekdayHours for the date when config is loading', () => {
      const monthRepo = new InMemoryMonthRepository({})
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      // DATE = 2026-05-15 = Thursday, default = 8h
      expect(result.current.sollstunden).toBe(8)
    })

    it('uses Remote as default work location when config has no override', async () => {
      const monthRepo = new InMemoryMonthRepository({})
      const configRepo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, defaultWorkLocation: 'Remote' })
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.config).toBeDefined())

      expect(result.current.defaultWorkLocation).toBe('Remote')
    })
  })

  describe('computed stats', () => {
    it('computes workedHours from work period start/end times', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { [DATE]: { windows: [period('p1', '09:00', '11:00')] } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.windows).toHaveLength(1))

      expect(result.current.workedHours).toBeCloseTo(2)
    })

    it('returns zero workedHours for an empty day', async () => {
      const monthRepo = new InMemoryMonthRepository({})
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.config).toBeDefined())

      expect(result.current.workedHours).toBe(0)
    })

    it('accumulates workedHours across multiple work periods', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': {
          [DATE]: {
            windows: [period('p1', '09:00', '11:00'), period('p2', '13:00', '15:30')],
          },
        },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.windows).toHaveLength(2))

      expect(result.current.workedHours).toBeCloseTo(4.5)
    })
  })

  describe('location and overrides', () => {
    it('reflects explicit day location override', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { [DATE]: { windows: [], location: 'Office' } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.workLocation).toBe('Office'))

      expect(result.current.effectiveLocation).toBe('Office')
    })

    it('reflects autoCategoryOverride from day data', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { [DATE]: { windows: [], autoCategoryOverride: '_SUPPORT' } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.autoCategoryOverride).toBe('_SUPPORT'))
    })

    it('reflects confirmed flag from day data', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-05': { [DATE]: { windows: [], confirmed: true } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery(DATE), { wrapper: makeWrapper(monthRepo, configRepo) })

      await waitFor(() => expect(result.current.isConfirmed).toBe(true))
    })
  })

  describe('overtime carry-over across months', () => {
    it('carries prior month overtime into the new month instead of resetting to zero', async () => {
      // April 2026: one WorkDay tracked, 10h worked against an 8h target → +2h overtime
      const monthRepo = new InMemoryMonthRepository({
        '2026-04': { '2026-04-01': { windows: [period('p1', '08:00', '18:00')] } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery('2026-05-01'), {
        wrapper: makeWrapper(monthRepo, configRepo),
      })

      await waitFor(() => expect(result.current.overtimeToDate.priorOvertime).toBeCloseTo(2))
    })

    it('waits for the real config before computing carry-over, instead of caching a value seeded from default weekdayHours', async () => {
      // April 1, 2026 is a Wednesday. Default weekdayHours target Wed=8h → +2h overtime for 10h worked.
      // A custom config with Wed=4h changes the correct answer to +6h — if the carry-over query fired
      // before this config resolved, it would compute (and permanently cache, since the query key
      // doesn't vary with weekdayHours) the wrong +2h.
      const monthRepo = new InMemoryMonthRepository({
        '2026-04': { '2026-04-01': { windows: [period('p1', '08:00', '18:00')] } },
      })
      const configRepo = new DelayedConfigRepository({
        ...DEFAULT_APP_CONFIG,
        weekdayHours: [0, 8, 8, 4, 8, 8, 0],
      })
      const { result } = renderHook(() => useDayQuery('2026-05-01'), {
        wrapper: makeWrapper(monthRepo, configRepo),
      })

      await waitFor(() => expect(result.current.overtimeToDate.priorOvertime).toBeCloseTo(6))
    })
  })

  describe('isOvertimeReady', () => {
    it('is false until both the month and carry-over queries resolve, then true', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-04': { '2026-04-01': { windows: [period('p1', '08:00', '18:00')] } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery('2026-05-01'), {
        wrapper: makeWrapper(monthRepo, configRepo),
      })

      expect(result.current.isOvertimeReady).toBe(false)

      await waitFor(() => expect(result.current.isOvertimeReady).toBe(true))
      expect(result.current.overtimeToDate.priorOvertime).toBeCloseTo(2)
    })
  })

  describe('date routing', () => {
    it('queries the correct year and month from the date string', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-03': { '2026-03-10': { windows: [period('p1', '10:00', '12:00')] } },
      })
      const configRepo = new InMemoryConfigRepository()
      const { result } = renderHook(() => useDayQuery('2026-03-10'), {
        wrapper: makeWrapper(monthRepo, configRepo),
      })

      await waitFor(() => expect(result.current.windows).toHaveLength(1))

      expect(result.current.windows[0]?.id).toBe('p1')
    })
  })
})
