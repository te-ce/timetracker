import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CardHeader } from './CardHeader'
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

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function Harness({ repo, w, isRunning = false }: { repo: MonthRepository; w: WorkPeriod; isRunning?: boolean }) {
  const mutations = useWorkPeriodMutations(repo)
  return (
    <CardHeader w={w} date={DATE} duration={2} isRunning={isRunning} liveSubtask={undefined} mutations={mutations} />
  )
}

function makeRepo(w: WorkPeriod) {
  return new InMemoryMonthRepository({ '2026-06': { [DATE]: { windows: [w] } } })
}

describe('CardHeader', () => {
  it('shows the period start and end times', () => {
    const w: WorkPeriod = { id: 'p1', start: '09:00', end: '11:00', category: 'Work', subtasks: [] }
    render(<Harness repo={makeRepo(w)} w={w} />, { wrapper })
    expect(screen.getByRole('button', { name: /edit start time 09:00/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit end time 11:00/i })).toBeInTheDocument()
  })

  it('shows a Stop button only while the period is running', () => {
    const w: WorkPeriod = { id: 'p1', start: '09:00', end: null, category: 'Work', subtasks: [] }
    const { rerender } = render(<Harness repo={makeRepo(w)} w={w} isRunning />, { wrapper })
    expect(screen.getByRole('button', { name: /stop tracking/i })).toBeInTheDocument()
    rerender(<Harness repo={makeRepo(w)} w={w} isRunning={false} />)
    expect(screen.queryByRole('button', { name: /stop tracking/i })).not.toBeInTheDocument()
  })

  it('edits the start and end time and saves the new window', async () => {
    const w: WorkPeriod = { id: 'p1', start: '09:00', end: '11:00', category: 'Work', subtasks: [] }
    const repo = makeRepo(w)
    render(<Harness repo={repo} w={w} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /edit start time 09:00/i }))
    const startInput = screen.getByLabelText('Edit start time')
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '08:00')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.start).toBe('08:00')
  })

  it('deletes the period after confirming', async () => {
    const w: WorkPeriod = { id: 'p1', start: '09:00', end: '11:00', category: 'Work', subtasks: [] }
    const repo = makeRepo(w)
    render(<Harness repo={repo} w={w} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /remove period/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows ?? []).toHaveLength(0)
  })
})
