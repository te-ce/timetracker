import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryWorkWindowRepository } from '../repositories/in-memory'
import { WorkWindowPanel } from './WorkWindowPanel'

const DATE = '2024-01-15'
const SOLLSTUNDEN = 8

function setup(initialWindows = []) {
  const repo = new InMemoryWorkWindowRepository(initialWindows)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <WorkWindowPanel date={DATE} sollstunden={SOLLSTUNDEN} repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

async function addWindow(start: string, end: string) {
  await userEvent.type(screen.getByLabelText(/start/i), start)
  await userEvent.type(screen.getByLabelText(/end/i), end)
  await userEvent.click(screen.getByRole('button', { name: /add/i }))
}

describe('WorkWindowPanel', () => {
  it('shows an empty state message when no WorkWindows exist', async () => {
    setup()
    expect(await screen.findByText(/no work windows/i)).toBeInTheDocument()
  })

  it('does not show Restarbeitszeit when no WorkWindows exist', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    expect(screen.queryByLabelText(/restarbeitszeit/i)).not.toBeInTheDocument()
  })

  it('shows the window in the list after the user adds it', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    await addWindow('09:00', '17:00')
    expect(await screen.findByText('09:00 – 17:00')).toBeInTheDocument()
  })

  it('updates WorkedHours when a window is added', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    await addWindow('09:00', '17:00')
    expect(await screen.findByLabelText(/worked hours/i)).toHaveTextContent('8h worked')
  })

  it('shows Restarbeitszeit after the first WorkWindow is added', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    await addWindow('09:00', '17:00')
    expect(await screen.findByLabelText(/restarbeitszeit/i)).toBeInTheDocument()
  })

  it('shows correct remaining hours in Restarbeitszeit', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    await addWindow('09:00', '15:00') // 6h worked, 8h target → 2h remaining
    expect(await screen.findByLabelText(/restarbeitszeit/i)).toHaveTextContent('2h remaining')
  })

  it('removes the window from the list when the user clicks Remove', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    await addWindow('09:00', '17:00')
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(await screen.findByText(/no work windows/i)).toBeInTheDocument()
  })

  it('hides Restarbeitszeit again when the last WorkWindow is removed', async () => {
    setup()
    await screen.findByText(/no work windows/i)
    await addWindow('09:00', '17:00')
    await screen.findByLabelText(/restarbeitszeit/i)
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    await screen.findByText(/no work windows/i)
    expect(screen.queryByLabelText(/restarbeitszeit/i)).not.toBeInTheDocument()
  })

  it('clicking a window shows edit inputs with current values', async () => {
    setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
  })

  it('editing a window updates the stored time', async () => {
    const { repo } = setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))

    const startInput = screen.getByDisplayValue('09:00')
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '08:00')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('08:00 – 17:00')).toBeInTheDocument()
    const saved = await repo.findByDate(new Date(DATE))
    expect(saved[0].start).toBe('08:00')
  })

  it('pressing Escape cancels editing without saving', async () => {
    setup([{ id: 'w1', date: DATE, start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))

    const startInput = screen.getByDisplayValue('09:00')
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '07:00')
    await userEvent.keyboard('{Escape}')

    expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('07:00')).not.toBeInTheDocument()
  })
})
