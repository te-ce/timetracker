import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory'
import { WorkedHoursCell } from './WorkedHoursCell'
import type { WorkPeriod } from '../../infra/repositories/types'

const DATE = '2024-01-15'
const YEAR = 2024
const MONTH = 1

const CATEGORIES = ['Dev', 'Meeting']

function makeWindow(id: string, start: string, end: string | null): WorkPeriod {
  return { id, start, end, category: '_UNCATEGORIZED', subtasks: [] }
}

function setup(initialWindows: WorkPeriod[] = [], workedHours = 8) {
  const repo = new InMemoryMonthRepository(
    initialWindows.length > 0 ? { '2024-01': { [DATE]: { windows: initialWindows } } } : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>
          <tr>
            <WorkedHoursCell
              date={DATE}
              workedHours={workedHours}
              windows={initialWindows}
              repository={repo}
              autoCategory={null}
              customCategories={CATEGORIES}
            />
          </tr>
        </tbody>
      </table>
    </QueryClientProvider>,
  )
  return { repo }
}

describe('WorkedHoursCell', () => {
  it('displays worked hours as text when not editing', () => {
    setup()
    expect(screen.getByText('8.00')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /day timeline/i })).not.toBeInTheDocument()
  })

  it('clicking opens the day timeline with the day’s work periods', async () => {
    setup([makeWindow('w1', '09:00', '13:00'), makeWindow('w2', '14:00', '18:00')])
    await userEvent.click(screen.getByText('8.00'))

    const timeline = await screen.findByRole('list', { name: /day timeline/i })
    expect(within(timeline).getByRole('listitem', { name: /work period 1, 09:00 to 13:00/i })).toBeInTheDocument()
    expect(within(timeline).getByRole('listitem', { name: /work period 2, 14:00 to 18:00/i })).toBeInTheDocument()
  })

  it('leaves the totals panel out — the table already carries the numbers', async () => {
    setup([makeWindow('w1', '09:00', '13:00')])
    await userEvent.click(screen.getByText('8.00'))

    await screen.findByRole('list', { name: /day timeline/i })
    expect(screen.queryByRole('complementary', { name: /day totals/i })).not.toBeInTheDocument()
  })

  it('shows the break between two work periods', async () => {
    setup([makeWindow('w1', '09:00', '13:00'), makeWindow('w2', '14:00', '18:00')])
    await userEvent.click(screen.getByText('8.00'))

    expect(await screen.findByRole('listitem', { name: /break 1\.00h, 13:00 to 14:00/i })).toBeInTheDocument()
  })

  it('offers to log a work period for a past day, not live tracking', async () => {
    setup()
    await userEvent.click(screen.getByText('8.00'))

    expect(await screen.findByRole('button', { name: /add work period/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start tracking/i })).not.toBeInTheDocument()
  })

  it('clicking outside closes the editor', async () => {
    setup([makeWindow('w1', '09:00', '13:00')])
    await userEvent.click(screen.getByText('8.00'))
    await screen.findByRole('list', { name: /day timeline/i })

    await userEvent.click(document.body)

    await waitFor(() => {
      expect(screen.queryByRole('list', { name: /day timeline/i })).not.toBeInTheDocument()
    })
  })

  it('pressing Escape closes the editor', async () => {
    setup([makeWindow('w1', '09:00', '13:00')])
    await userEvent.click(screen.getByText('8.00'))
    await screen.findByRole('list', { name: /day timeline/i })

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('list', { name: /day timeline/i })).not.toBeInTheDocument()
    })
  })

  it('clicking the × close button closes the editor', async () => {
    setup([makeWindow('w1', '09:00', '13:00')])
    await userEvent.click(screen.getByText('8.00'))
    await screen.findByRole('list', { name: /day timeline/i })

    await userEvent.click(screen.getByRole('button', { name: /close/i }))

    await waitFor(() => {
      expect(screen.queryByRole('list', { name: /day timeline/i })).not.toBeInTheDocument()
    })
  })

  it('displays an open work period as still running', async () => {
    setup([makeWindow('w1', '09:00', null)], 0)
    await userEvent.click(screen.getByTestId('worked-hours'))

    expect(await screen.findByRole('listitem', { name: /work period 1, 09:00 to now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop work/i })).toBeInTheDocument()
  })

  describe('subtasks', () => {
    it('shows existing subtasks of a work period', async () => {
      const windowWithSubtask: WorkPeriod = {
        id: 'w1',
        start: '09:00',
        end: '17:00',
        category: '_UNCATEGORIZED',
        subtasks: [{ id: 's1', category: 'Meeting', hours: 2 }],
      }
      setup([windowWithSubtask])
      await userEvent.click(screen.getByText('8.00'))

      expect(await screen.findByRole('button', { name: /edit Meeting subtask/i })).toBeInTheDocument()
    })

    it('logs an untracked subtask on an existing work period', async () => {
      const { repo } = setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))

      await userEvent.click(await screen.findByRole('button', { name: /log untracked subtask/i }))
      await userEvent.type(screen.getByLabelText(/subtask duration/i), '2')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.subtasks).toHaveLength(1)
        expect(data[DATE]?.windows[0]?.subtasks[0]?.hours).toBe(2)
      })
    })
  })
})
