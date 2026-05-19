import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryDayTypeOverrideRepository } from '../repositories/in-memory'
import { DayTypePicker } from './DayTypePicker'

const DATE = '2024-01-15'

function setup(initial: Array<{ date: string; dayType: 'PublicHoliday' | 'Vacation' | 'SickDay' | 'Absence' }> = []) {
  const repo = new InMemoryDayTypeOverrideRepository(initial)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <DayTypePicker date={DATE} repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

describe('DayTypePicker', () => {
  it('shows WorkDay when no override is set', async () => {
    setup()
    expect(await screen.findByDisplayValue('WorkDay')).toBeInTheDocument()
  })

  it('shows current override value', async () => {
    setup([{ date: DATE, dayType: 'Vacation' }])
    expect(await screen.findByDisplayValue('Vacation')).toBeInTheDocument()
  })

  it('saves override when user selects a new day type', async () => {
    const { repo } = setup()
    const select = await screen.findByDisplayValue('WorkDay')
    await userEvent.selectOptions(select, 'SickDay')

    await waitFor(async () => {
      expect(await repo.findByDate(DATE)).toBe('SickDay')
    })
  })

  it('removes override when user selects WorkDay', async () => {
    const { repo } = setup([{ date: DATE, dayType: 'Vacation' }])
    const select = await screen.findByDisplayValue('Vacation')
    await userEvent.selectOptions(select, 'WorkDay')

    await waitFor(async () => {
      expect(await repo.findByDate(DATE)).toBeNull()
    })
  })
})
