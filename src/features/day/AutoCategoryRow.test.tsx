import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AutoCategoryRow } from './AutoCategoryRow'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthRepository } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6
const PERIOD_ID = 'p1'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeRepo() {
  return new InMemoryMonthRepository({
    '2026-06': {
      [DATE]: { windows: [{ id: PERIOD_ID, start: '09:00', end: '11:00', category: 'Work', subtasks: [] }] },
    },
  })
}

function Harness({ repo, isRunning = false }: { repo: MonthRepository; isRunning?: boolean }) {
  const mutations = useWorkPeriodMutations(repo)
  return (
    <AutoCategoryRow
      hours={2}
      isRunning={isRunning}
      hasLiveSubtask={false}
      category="Work"
      categories={['Work', 'Meeting']}
      periodId={PERIOD_ID}
      date={DATE}
      mutations={mutations}
      index={0}
    />
  )
}

describe('AutoCategoryRow', () => {
  it('shows the category and formatted hours', () => {
    render(<Harness repo={makeRepo()} />, { wrapper })
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('switches to a category picker on click and persists the new category', async () => {
    const repo = makeRepo()
    render(<Harness repo={repo} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'Edit category' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Meeting')

    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.category).toBe('Meeting')
  })

  it('shows a live indicator dot while running with no live subtask', () => {
    const { container } = render(<Harness repo={makeRepo()} isRunning />, { wrapper })
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
