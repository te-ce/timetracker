import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory'
import { DayTypePicker } from './DayTypePicker'
import type { DayType } from './dayType'
import type { DayTypeOverride, LeaveType } from '../../infra/repositories/types'

const DATE = '2024-01-15'

function setup(dayType: DayType, storedOverride?: DayTypeOverride, halfDayLeave?: LeaveType) {
  const repo = new InMemoryMonthRepository(
    storedOverride || halfDayLeave
      ? {
          '2024-01': {
            [DATE]: {
              windows: [],
              ...(storedOverride !== undefined ? { dayTypeOverride: storedOverride } : {}),
              ...(halfDayLeave !== undefined ? { halfDayLeave } : {}),
            },
          },
        }
      : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <DayTypePicker date={DATE} dayType={dayType} halfDayLeave={halfDayLeave} repository={repo} />
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

  it('shows half-day leave buttons only for a WorkDay', () => {
    setup('WorkDay')
    expect(screen.getByRole('button', { name: '½ Vacation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '½ Sick day' })).toBeInTheDocument()
  })

  it('hides half-day leave buttons for a non-WorkDay', () => {
    setup('Vacation', 'Vacation')
    expect(screen.queryByRole('button', { name: '½ Vacation' })).not.toBeInTheDocument()
  })

  it('saves halfDayLeave when a half-day button is clicked', async () => {
    const { repo } = setup('WorkDay')
    await userEvent.click(screen.getByRole('button', { name: '½ Vacation' }))

    await waitFor(async () => {
      const data = await repo.getMonth(2024, 1)
      expect(data[DATE]?.halfDayLeave).toBe('Vacation')
    })
  })

  it('marks the active half-day button as pressed', () => {
    setup('WorkDay', undefined, 'SickDay')
    expect(screen.getByRole('button', { name: '½ Sick day' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '½ Vacation' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clears halfDayLeave when clicking the already-active half-day button', async () => {
    const { repo } = setup('WorkDay', undefined, 'Vacation')
    await userEvent.click(screen.getByRole('button', { name: '½ Vacation' }))

    await waitFor(async () => {
      const data = await repo.getMonth(2024, 1)
      expect(data[DATE]?.halfDayLeave).toBeUndefined()
    })
  })
})
