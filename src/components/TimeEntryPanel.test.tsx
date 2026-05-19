import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryTimeEntryRepository } from '../repositories/in-memory'
import { TimeEntryPanel } from './TimeEntryPanel'
import { CATEGORIES } from '../repositories/types'

const DATE = '2024-01-15'

function setup(initialEntries = []) {
  const repo = new InMemoryTimeEntryRepository(initialEntries)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TimeEntryPanel date={DATE} repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

describe('TimeEntryPanel', () => {
  it('renders all 10 fixed categories', async () => {
    setup()
    for (const category of CATEGORIES) {
      expect(await screen.findByText(category)).toBeInTheDocument()
    }
  })

  it('loads existing bookings from the repository on mount', async () => {
    setup([{ id: '1', date: DATE, category: 'QA', hours: 3 }])
    const input = await screen.findByLabelText('Hours for QA')
    await waitFor(() => expect(input).toHaveValue(3))
  })

  it('saves hours when user types and blurs', async () => {
    const { repo } = setup()
    const input = await screen.findByLabelText('Hours for Support')
    await userEvent.clear(input)
    await userEvent.type(input, '2.5')
    await userEvent.tab()
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === 'Support')?.hours).toBe(2.5)
    })
  })

  it('updates an existing booking with a new value', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: 'Infra', hours: 4 }])
    const input = await screen.findByLabelText('Hours for Infra')
    await waitFor(() => expect(input).toHaveValue(4))
    await userEvent.clear(input)
    await userEvent.type(input, '6')
    await userEvent.tab()
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === 'Infra')?.hours).toBe(6)
    })
  })

  it('removes the entry when hours set to 0', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: 'QA', hours: 3 }])
    const input = await screen.findByLabelText('Hours for QA')
    await waitFor(() => expect(input).toHaveValue(3))
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === 'QA')).toBeUndefined()
    })
  })

  it('displays total booked hours', async () => {
    setup([
      { id: '1', date: DATE, category: 'QA', hours: 3 },
      { id: '2', date: DATE, category: 'Infra', hours: 2 },
    ])
    expect(await screen.findByLabelText('Total booked hours')).toHaveTextContent('5h')
  })
})
