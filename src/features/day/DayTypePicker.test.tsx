import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory'
import { DayTypePicker } from './DayTypePicker'
import type { DayType } from './dayType'
import type { DayTypeOverride } from '../../infra/repositories/types'

const DATE = '2024-01-15'

function setup(dayType: DayType, storedOverride?: DayTypeOverride) {
  const repo = new InMemoryMonthRepository(
    storedOverride ? { '2024-01': { [DATE]: { windows: [], dayTypeOverride: storedOverride } } } : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <DayTypePicker date={DATE} dayType={dayType} repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

describe('DayTypePicker', () => {
  it('shows WorkDay when dayType is WorkDay', () => {
    setup('WorkDay')
    expect(screen.getByDisplayValue('WorkDay')).toBeInTheDocument()
  })

  it('shows Weekend when dayType is Weekend', () => {
    setup('Weekend')
    expect(screen.getByDisplayValue('Weekend')).toBeInTheDocument()
  })

  it('shows current override value', () => {
    setup('Vacation', 'Vacation')
    expect(screen.getByDisplayValue('Vacation')).toBeInTheDocument()
  })

  it('saves override when user selects a new day type', async () => {
    const { repo } = setup('WorkDay')
    const select = screen.getByDisplayValue('WorkDay')
    await userEvent.selectOptions(select, 'SickDay')

    const data = await repo.getMonth(2024, 1)
    expect(data[DATE]?.dayTypeOverride).toBe('SickDay')
  })

  it('removes override when user selects WorkDay', async () => {
    const { repo } = setup('Vacation', 'Vacation')
    const select = screen.getByDisplayValue('Vacation')
    await userEvent.selectOptions(select, 'WorkDay')

    const data = await repo.getMonth(2024, 1)
    expect(data[DATE]?.dayTypeOverride).toBeUndefined()
  })

  it('removes override when user selects Weekend', async () => {
    const { repo } = setup('Vacation', 'Vacation')
    const select = screen.getByDisplayValue('Vacation')
    await userEvent.selectOptions(select, 'Weekend')

    const data = await repo.getMonth(2024, 1)
    expect(data[DATE]?.dayTypeOverride).toBeUndefined()
  })
})
