import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryWorkPeriodRepository } from '../repositories/in-memory'
import { WorkedHoursCell } from './WorkedHoursCell'

const DATE = '2024-01-15'

function setup(initialWindows: Array<{ id: string; date: string; start: string; end: string }> = []) {
  const repo = new InMemoryWorkPeriodRepository(initialWindows)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <table>
        <tbody>
          <tr>
            <WorkedHoursCell date={DATE} workedHours={8} repository={repo} />
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
    await screen.findByLabelText(/from/i)
    await userEvent.type(screen.getByLabelText(/from/i), '09:00')
    await userEvent.type(screen.getByLabelText(/to/i), '13:30')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(async () => {
      const windows = await repo.findByDate(new Date(DATE))
      expect(windows.length).toBe(1)
      expect(windows[0].start).toBe('09:00')
      expect(windows[0].end).toBe('13:30')
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
})
