import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSprintExportReminder } from './useSprintExportReminder'
import { SPRINT_EXPORT_NOTIFY_KEY } from './sprintExportReminder'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { MonthData, SprintExport } from '../../infra/repositories/types'

// Sprints start 2026-01-05, 14 days long. On 2026-06-30 sprint index 12 (Jun 22 - Jul 5) is current,
// index 11 is Jun 8 - Jun 21 and index 5 is Mar 16 - Mar 29 (outside the 6-sprint lookback).
const CONFIG = { ...DEFAULT_APP_CONFIG, sprintStartDate: '2026-01-05', sprintLengthDays: 14 }

function workedDay(id: string, category = '_COREMEDIA'): MonthData[string] {
  return { windows: [{ id, start: '09:00', end: '12:00', category, subtasks: [] }] }
}

const SPRINT_11_HOURS: Record<string, MonthData> = { '2026-06': { '2026-06-10': workedDay('w11') } }
const SPRINT_5_HOURS: Record<string, MonthData> = { '2026-03': { '2026-03-17': workedDay('w5') } }

class FailingSprintExportRepository extends InMemorySprintExportRepository {
  override findBySprintIndex(): Promise<SprintExport | null> {
    return Promise.reject(new Error('disk gone'))
  }
}

interface Setup {
  monthData?: Record<string, MonthData>
  exports?: SprintExport[]
  sprintExportRepo?: InMemorySprintExportRepository
}

async function setup({ monthData = {}, exports = [], sprintExportRepo }: Setup = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const monthRepo = new InMemoryMonthRepository(monthData)
  const exportRepo = sprintExportRepo ?? new InMemorySprintExportRepository()
  for (const record of exports) await exportRepo.save(record)
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(CONFIG),
    sprintExportRepo: exportRepo,
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
  return renderHook(() => useSprintExportReminder(), { wrapper: Wrapper })
}

describe('useSprintExportReminder', () => {
  const notify = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 30, 12, 0, 0))
    localStorage.clear()
    notify.mockClear()
    vi.stubGlobal('electronAPI', { notify: { sprintExportDue: notify } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('is undefined while loading, then resolves to a countdown when nothing is due', async () => {
    const { result } = await setup()
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toEqual({ kind: 'countdown', daysLeft: 5 }))
  })

  it('asks for export of an ended sprint that has hours and no export record', async () => {
    const { result } = await setup({ monthData: SPRINT_11_HOURS })
    await waitFor(() => expect(result.current?.kind).toBe('export'))
    expect(result.current).toEqual({ kind: 'export', sprints: [{ index: 11, start: '2026-06-08', end: '2026-06-21' }] })
  })

  it('does not ask for sprints without hours', async () => {
    const { result } = await setup({ exports: [] })
    await waitFor(() => expect(result.current?.kind).toBe('countdown'))
  })

  it('treats a record exported at sprint end as exported', async () => {
    const record: SprintExport = { sprintIndex: 11, status: 'exported', exportedAt: '2026-06-22' }
    const { result } = await setup({ monthData: SPRINT_11_HOURS, exports: [record] })
    await waitFor(() => expect(result.current?.kind).toBe('countdown'))
  })

  it('ignores stale records exported mid-sprint or for other boundaries', async () => {
    const midSprint: SprintExport = { sprintIndex: 11, status: 'exported', exportedAt: '2026-06-15' }
    const { result } = await setup({ monthData: SPRINT_11_HOURS, exports: [midSprint] })
    await waitFor(() => expect(result.current?.kind).toBe('export'))
  })

  it('ignores records stored for different sprint boundaries', async () => {
    const otherBoundaries: SprintExport = {
      sprintIndex: 11,
      status: 'exported',
      exportedAt: '2026-06-22',
      sprintStart: '2026-06-01',
      sprintEnd: '2026-06-14',
    }
    const { result } = await setup({ monthData: SPRINT_11_HOURS, exports: [otherBoundaries] })
    await waitFor(() => expect(result.current?.kind).toBe('export'))
  })

  it('only looks back six sprints', async () => {
    const { result } = await setup({ monthData: SPRINT_5_HOURS })
    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current?.kind).toBe('countdown')
  })

  it('still resolves when reading an export record fails, and reminds about the sprint', async () => {
    const { result } = await setup({
      monthData: SPRINT_11_HOURS,
      sprintExportRepo: new FailingSprintExportRepository(),
    })
    await waitFor(() => expect(result.current?.kind).toBe('export'))
  })

  it('notifies once per day for the same pending sprints', async () => {
    const first = await setup({ monthData: SPRINT_11_HOURS })
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1))
    expect(notify).toHaveBeenCalledWith('Sprint 12 ended, export your hours')
    expect(JSON.parse(localStorage.getItem(SPRINT_EXPORT_NOTIFY_KEY) ?? '{}')).toEqual({
      date: '2026-06-30',
      indices: [11],
    })

    first.rerender()
    first.unmount()
    const second = await setup({ monthData: SPRINT_11_HOURS })
    await waitFor(() => expect(second.result.current?.kind).toBe('export'))
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('notifies again on a later day', async () => {
    localStorage.setItem(SPRINT_EXPORT_NOTIFY_KEY, JSON.stringify({ date: '2026-06-29', indices: [11] }))
    await setup({ monthData: SPRINT_11_HOURS })
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1))
  })
})
