import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository } from '../repositories/in-memory'
import { DayTypePicker } from './DayTypePicker'
import type { DayTypeOverride } from '../repositories/types'

const DATE = '2024-01-15'

function setup(override?: DayTypeOverride) {
  const repo = new InMemoryMonthRepository(
    override ? { '2024-01': { [DATE]: { windows: [], dayTypeOverride: override } } } : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <DayTypePicker date={DATE} override={override} repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

describe('DayTypePicker', () => {
  it('shows WorkDay when no override is set', () => {
    setup()
    expect(screen.getByDisplayValue('WorkDay')).toBeInTheDocument()
  })

  it('shows current override value', () => {
    setup('Vacation')
    expect(screen.getByDisplayValue('Vacation')).toBeInTheDocument()
  })

  it('saves override when user selects a new day type', async () => {
    const { repo } = setup()
    const select = screen.getByDisplayValue('WorkDay')
    await userEvent.selectOptions(select, 'SickDay')

    const data = await repo.getMonth(2024, 1)
    expect(data[DATE]?.dayTypeOverride).toBe('SickDay')
  })

  it('removes override when user selects WorkDay', async () => {
    const { repo } = setup('Vacation')
    const select = screen.getByDisplayValue('Vacation')
    await userEvent.selectOptions(select, 'WorkDay')

    const data = await repo.getMonth(2024, 1)
    expect(data[DATE]?.dayTypeOverride).toBeUndefined()
  })
})
