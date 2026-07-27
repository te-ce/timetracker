import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LiveSubtaskBanner } from './LiveSubtaskBanner'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthRepository, WorkPeriodSubtask } from '../../infra/repositories/types'
import type { LiveSubtask } from './workPeriodShared'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6
const PERIOD_ID = 'p1'
const LIVE_SUBTASK: LiveSubtask = { id: 'sl-live', category: 'Meeting', hours: 0, startedAt: '09:00' }

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeRepo(sl: WorkPeriodSubtask = LIVE_SUBTASK) {
  return new InMemoryMonthRepository({
    '2026-06': {
      [DATE]: { windows: [{ id: PERIOD_ID, start: '09:00', end: null, category: 'Meeting', subtasks: [sl] }] },
    },
  })
}

function Harness({ repo, nowTime = '10:00' }: { repo: MonthRepository; nowTime?: string }) {
  const mutations = useWorkPeriodMutations(repo)
  return (
    <LiveSubtaskBanner
      subtask={LIVE_SUBTASK}
      periodId={PERIOD_ID}
      date={DATE}
      nowTime={nowTime}
      categories={['Work', 'Meeting']}
      mutations={mutations}
    />
  )
}

describe('LiveSubtaskBanner', () => {
  it('shows the subtask category and started-at time', () => {
    render(<Harness repo={makeRepo()} />, { wrapper })
    expect(screen.getByTestId('live-subtask-category')).toHaveTextContent('Meeting')
    expect(screen.getByRole('button', { name: /edit subtask start time 09:00/i })).toBeInTheDocument()
  })

  it('changes the subtask category via addSubtask', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByTestId('live-subtask-category'))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Work')

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks[0]?.category).toBe('Work')
  })

  it('stops the live subtask with an end time via Stop subtask', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /stop subtask/i }))
    const endInput = screen.getByLabelText('Edit subtask end time')
    await userEvent.clear(endInput)
    await userEvent.type(endInput, '10:00')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks[0]).toMatchObject({ stoppedAt: '10:00' })
  })

  it('deletes the live subtask after confirming', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /delete live subtask/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks).toHaveLength(0)
  })
})
