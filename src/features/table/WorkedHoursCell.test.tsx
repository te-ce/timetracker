import { render, screen, waitFor } from '@testing-library/react'
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

async function getWindows(repo: InMemoryMonthRepository): Promise<WorkPeriod[]> {
  const data = await repo.getMonth(YEAR, MONTH)
  return data[DATE]?.windows ?? []
}

describe('WorkedHoursCell', () => {
  it('displays worked hours as text when not editing', () => {
    setup()
    expect(screen.getByText('8.00')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('clicking opens editor with existing windows listed', async () => {
    setup([makeWindow('w1', '09:00', '13:00'), makeWindow('w2', '14:00', '18:00')])
    await userEvent.click(screen.getByText('8.00'))
    expect(await screen.findByText('09:00 – 13:00')).toBeInTheDocument()
    expect(screen.getByText('14:00 – 18:00')).toBeInTheDocument()
  })

  it('user can add a duration entry via from/to inputs', async () => {
    const { repo } = setup()
    await userEvent.click(screen.getByText('8.00'))
    // NowChip renders as a button initially; click it to switch to time input
    await userEvent.click(await screen.findByRole('button', { name: /now/i }))
    const startInput = screen.getByLabelText(/^start$/i)
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '09:00')
    await userEvent.type(screen.getByLabelText(/end/i), '13:30')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(async () => {
      const windows = await getWindows(repo)
      expect(windows.length).toBe(1)
      expect(windows[0]!.start).toBe('09:00')
      expect(windows[0]!.end).toBe('13:30')
    })
  })

  it('user can remove a duration entry', async () => {
    const { repo } = setup([makeWindow('w1', '09:00', '13:00')])
    await userEvent.click(screen.getByText('8.00'))
    await screen.findByText('09:00 – 13:00')
    await userEvent.click(screen.getByRole('button', { name: /remove period/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    await waitFor(async () => {
      const windows = await getWindows(repo)
      expect(windows.length).toBe(0)
    })
  })

  it('clicking outside closes the editor', async () => {
    setup([makeWindow('w1', '09:00', '13:00')])
    await userEvent.click(screen.getByText('8.00'))
    await screen.findByText('09:00 – 13:00')
    await userEvent.click(document.body)
    await waitFor(() => {
      expect(screen.queryByText('09:00 – 13:00')).not.toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    it('clicking a period switches it to edit mode with current values', async () => {
      setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByText('09:00 – 17:00'))

      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('saving an edit updates the period in the repository', async () => {
      const { repo } = setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByText('09:00 – 17:00'))
      const startInput = screen.getByDisplayValue('09:00')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '08:00')
      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(async () => {
        const windows = await getWindows(repo)
        expect(windows[0]!.start).toBe('08:00')
      })
    })

    it('pressing Enter in the edit start input saves the period', async () => {
      const { repo } = setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByText('09:00 – 17:00'))
      const startInput = screen.getByDisplayValue('09:00')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '10:00{Enter}')

      await waitFor(async () => {
        const windows = await getWindows(repo)
        expect(windows[0]!.start).toBe('10:00')
      })
    })

    it('pressing Enter in the edit end input saves the period', async () => {
      const { repo } = setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByText('09:00 – 17:00'))
      const endInput = screen.getByDisplayValue('17:00')
      await userEvent.clear(endInput)
      await userEvent.type(endInput, '18:00{Enter}')

      await waitFor(async () => {
        const windows = await getWindows(repo)
        expect(windows[0]!.end).toBe('18:00')
      })
    })

    it('pressing Escape in edit mode closes the modal', async () => {
      setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByText('09:00 – 17:00'))
      const startInput = screen.getByDisplayValue('09:00')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '07:00')
      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByDisplayValue('07:00')).not.toBeInTheDocument()
        expect(screen.queryByText('09:00 – 17:00')).not.toBeInTheDocument()
      })
    })

    it('Cancel button exits edit mode without saving', async () => {
      setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByText('09:00 – 17:00'))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(await screen.findByText('09:00 – 17:00')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument()
    })
  })

  describe('open period (no end)', () => {
    it('displays open period as "HH:MM – --:--"', async () => {
      setup([makeWindow('w1', '09:00', null)], 0)
      await userEvent.click(screen.getByTestId('worked-hours'))
      expect(await screen.findByText('09:00 – --:--')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows no periods message when list is empty', async () => {
      setup()
      await userEvent.click(screen.getByText('8.00'))
      expect(await screen.findByText(/no periods recorded yet/i)).toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('clicking the × close button closes the modal', async () => {
      setup([makeWindow('w1', '09:00', '13:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByText('09:00 – 13:00')
      await userEvent.click(screen.getByRole('button', { name: /close/i }))
      await waitFor(() => {
        expect(screen.queryByText('09:00 – 13:00')).not.toBeInTheDocument()
      })
    })
  })

  describe('pressing Escape in add form', () => {
    it('pressing Escape closes the modal from the start input', async () => {
      setup()
      await userEvent.click(screen.getByText('8.00'))
      // NowChip renders as a button; click it to switch to time input
      await userEvent.click(await screen.findByRole('button', { name: /now/i }))
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByLabelText(/^start$/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('subtask editing', () => {
    it('shows existing subtasks when a period has subtasks', async () => {
      const windowWithSlice: WorkPeriod = {
        id: 'w1',
        start: '09:00',
        end: '17:00',
        category: '_UNCATEGORIZED',
        subtasks: [{ id: 's1', category: 'Meeting', hours: 2 }],
      }
      setup([windowWithSlice])
      await userEvent.click(screen.getByText('8.00'))
      expect(await screen.findByRole('button', { name: /edit Meeting subtask/i })).toBeInTheDocument()
    })

    it('user can add a subtask to an existing period', async () => {
      const { repo } = setup([makeWindow('w1', '09:00', '17:00')])
      await userEvent.click(screen.getByText('8.00'))
      await screen.findByRole('button', { name: /log subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
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
