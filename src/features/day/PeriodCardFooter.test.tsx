import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PeriodCardFooter } from './PeriodCardFooter'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthRepository, WorkPeriod } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6
const PERIOD_ID = 'p1'

function makeRepo(
  windows: WorkPeriod[] = [{ id: PERIOD_ID, start: '09:00', end: null, category: 'Work', subtasks: [] }],
) {
  return new InMemoryMonthRepository({ '2026-06': { [DATE]: { windows } } })
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function Harness({ repo, canStartLiveSubtask = true }: { repo: MonthRepository; canStartLiveSubtask?: boolean }) {
  const mutations = useWorkPeriodMutations(repo)
  return (
    <PeriodCardFooter
      canStartLiveSubtask={canStartLiveSubtask}
      periodId={PERIOD_ID}
      date={DATE}
      categories={['Work', 'Meeting']}
      defaultCategory="Work"
      mutations={mutations}
    />
  )
}

describe('PeriodCardFooter', () => {
  it('shows the start-subtask button only when canStartLiveSubtask is true', () => {
    render(<Harness repo={makeRepo()} canStartLiveSubtask={false} />, { wrapper })
    expect(screen.queryByRole('button', { name: /start tracking subtask/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log subtask/i })).toBeInTheDocument()
  })

  it('opens the SubtaskForm and persists a completed subtask via addSubtask', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
    await userEvent.type(screen.getByLabelText('Subtask duration'), '1.5')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks).toEqual([expect.objectContaining({ category: 'Work', hours: 1.5 })])
  })

  it('opens the StartSubtaskForm and persists a live subtask via startLiveSubtask', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /start tracking subtask/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks).toEqual([
      expect.objectContaining({ category: 'Work', startedAt: expect.any(String) }),
    ])
  })
})
