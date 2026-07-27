import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SubtaskRow } from './SubtaskRow'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthRepository, WorkPeriodSubtask } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6
const PERIOD_ID = 'p1'
const SUBTASK: WorkPeriodSubtask = { id: 'sl-1', category: 'Meeting', hours: 1.5, note: 'sync' }

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeRepo() {
  return new InMemoryMonthRepository({
    '2026-06': {
      [DATE]: { windows: [{ id: PERIOD_ID, start: '09:00', end: '11:00', category: 'Work', subtasks: [SUBTASK] }] },
    },
  })
}

function Harness({ repo, overlaps = false }: { repo: MonthRepository; overlaps?: boolean }) {
  const mutations = useWorkPeriodMutations(repo)
  return (
    <SubtaskRow
      sl={SUBTASK}
      index={1}
      periodId={PERIOD_ID}
      date={DATE}
      categories={['Work', 'Meeting']}
      mutations={mutations}
      overlaps={overlaps}
    />
  )
}

describe('SubtaskRow', () => {
  it('shows the category, hours, and note', () => {
    render(<Harness repo={makeRepo()} />, { wrapper })
    expect(screen.getByText('Meeting')).toBeInTheDocument()
    expect(screen.getByText('sync')).toBeInTheDocument()
  })

  it('switches to the edit form on click', async () => {
    render(<Harness repo={makeRepo()} />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /edit meeting subtask/i }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('deletes the subtask after confirming', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /remove meeting subtask/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks).toHaveLength(0)
  })
})
