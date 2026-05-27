import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryWorkPeriodRepository } from '../repositories/in-memory'
import { WorkedHoursCell } from './WorkedHoursCell'

const DATE = '2024-01-15'

function setup(initialWindows: Array<{ id: string; date: string; start: string; end: string | null }> = [], workedHours = 8) {
  const repo = new InMemoryWorkPeriodRepository(initialWindows)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>
          <tr>
            <WorkedHoursCell date={DATE} workedHours={workedHours} repository={repo} />
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
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('clicking opens editor with existing windows listed', async () => {
    setup([
      { id: 'w1', date: DATE, start: '09:00', end: '13:00' },
      { id: 'w2', date: DATE, start: '14:00', end: '18:00' },
    ])
    await userEvent.click(screen.getByText('8'))
    expect(await screen.findByText('09:00–13:00')).toBeInTheDocument()
    expect(screen.getByText('14:00–18:00')).toBeInTheDocument()
  })

  it('user can add a duration entry via from/to inputs', async () => {
    const { repo } = setup()
    await userEvent.click(screen.getByText('8'))
    await screen.findByLabelText(/start/i)
    await userEvent.type(screen.getByLabelText(/start/i), '09:00')
    await userEvent.type(screen.getByLabelText(/end/i), '13:30')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(async () => {
      const windows = await repo.findByDate(new Date(DATE))
      expect(windows.length).toBe(1)
      expect(windows[0]!.start).toBe('09:00')
      expect(windows[0]!.end).toBe('13:30')
    })
  })

  it('user can remove a duration entry', async () => {
    const { repo } = setup([{ id: 'w1', date: DATE, start: '09:00', end: '13:00' }])
    await userEvent.click(screen.getByText('8'))
    await screen.findByText('09:00–13:00')
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(async () => {
      const windows = await repo.findByDate(new Date(DATE))
      expect(windows.length).toBe(0)
    })
  })

  it('clicking outside closes the editor', async () => {
    setup([{ id: 'w1', date: DATE, start: '09:00', end: '13:00' }])
    await userEvent.click(screen.getByText('8'))
    await screen.findByText('09:00–13:00')
    await userEvent.click(document.body)
    await waitFor(() => {
      expect(screen.queryByText('09:00–13:00')).not.toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    it('clicking a period switches it to edit mode with current values', async () => {
      setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–17:00')

      await userEvent.click(screen.getByText('09:00–17:00'))

      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('saving an edit updates the period in the repository', async () => {
      const { repo } = setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–17:00')

      await userEvent.click(screen.getByText('09:00–17:00'))
      const startInput = screen.getByDisplayValue('09:00')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '08:00')
      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(async () => {
        const windows = await repo.findByDate(new Date(DATE))
        expect(windows[0]!.start).toBe('08:00')
      })
    })

    it('pressing Enter in the edit start input saves the period', async () => {
      const { repo } = setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–17:00')

      await userEvent.click(screen.getByText('09:00–17:00'))
      const startInput = screen.getByDisplayValue('09:00')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '10:00{Enter}')

      await waitFor(async () => {
        const windows = await repo.findByDate(new Date(DATE))
        expect(windows[0]!.start).toBe('10:00')
      })
    })

    it('pressing Enter in the edit end input saves the period', async () => {
      const { repo } = setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–17:00')

      await userEvent.click(screen.getByText('09:00–17:00'))
      const endInput = screen.getByDisplayValue('17:00')
      await userEvent.clear(endInput)
      await userEvent.type(endInput, '18:00{Enter}')

      await waitFor(async () => {
        const windows = await repo.findByDate(new Date(DATE))
        expect(windows[0]!.end).toBe('18:00')
      })
    })

    it('pressing Escape in edit mode closes the modal', async () => {
      setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–17:00')

      await userEvent.click(screen.getByText('09:00–17:00'))
      const startInput = screen.getByDisplayValue('09:00')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '07:00')
      await userEvent.keyboard('{Escape}')

      // Escape triggers the global handler which closes the modal entirely
      await waitFor(() => {
        expect(screen.queryByDisplayValue('07:00')).not.toBeInTheDocument()
        expect(screen.queryByText('09:00–17:00')).not.toBeInTheDocument()
      })
    })

    it('Cancel button exits edit mode without saving', async () => {
      setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–17:00')

      await userEvent.click(screen.getByText('09:00–17:00'))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(await screen.findByText('09:00–17:00')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument()
    })
  })

  describe('open period (no end)', () => {
    it('displays open period as "HH:MM–…"', async () => {
      setup([{ id: 'w1', date: DATE, start: '09:00', end: null }], 0)
      await userEvent.click(screen.getByTestId('worked-hours'))
      expect(await screen.findByText('09:00–…')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows no periods message when list is empty', async () => {
      setup()
      await userEvent.click(screen.getByText('8'))
      expect(await screen.findByText(/no periods recorded yet/i)).toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('clicking the × close button closes the modal', async () => {
      setup([{ id: 'w1', date: DATE, start: '09:00', end: '13:00' }])
      await userEvent.click(screen.getByText('8'))
      await screen.findByText('09:00–13:00')
      await userEvent.click(screen.getByRole('button', { name: /close/i }))
      await waitFor(() => {
        expect(screen.queryByText('09:00–13:00')).not.toBeInTheDocument()
      })
    })
  })

  describe('pressing Escape in add form', () => {
    it('pressing Escape closes the modal from the start input', async () => {
      setup()
      await userEvent.click(screen.getByText('8'))
      await screen.findByLabelText(/start/i)
      await userEvent.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByLabelText(/start/i)).not.toBeInTheDocument()
      })
    })
  })
})
