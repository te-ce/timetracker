import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WeeklyScheduleSettings } from './WeeklyScheduleSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('WeeklyScheduleSettings', () => {
  it('renders inputs for all 7 weekdays in Mon–Sun order', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WeeklyScheduleSettings repository={repo} />, { wrapper })
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    for (const day of days) {
      expect(await screen.findByLabelText(day)).toBeInTheDocument()
    }
  })

  it('shows default hours — Mon–Fri=8, Sat/Sun=0', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WeeklyScheduleSettings repository={repo} />, { wrapper })
    expect(await screen.findByLabelText('Monday')).toHaveValue(8)
    expect(screen.getByLabelText('Friday')).toHaveValue(8)
    expect(screen.getByLabelText('Saturday')).toHaveValue(0)
    expect(screen.getByLabelText('Sunday')).toHaveValue(0)
  })

  it('saves updated value when user changes a day and blurs', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WeeklyScheduleSettings repository={repo} />, { wrapper })
    const satInput = await screen.findByLabelText('Saturday')
    await userEvent.tripleClick(satInput)
    await userEvent.keyboard('2')
    await userEvent.tab()
    const saved = await repo.get()
    expect(saved.weekdayHours[6]).toBe(2) // Saturday = index 6
  })

  it('saves 0 when user enters 0 (non-working day)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WeeklyScheduleSettings repository={repo} />, { wrapper })
    const monInput = await screen.findByLabelText('Monday')
    await userEvent.tripleClick(monInput)
    await userEvent.keyboard('0')
    await userEvent.tab()
    const saved = await repo.get()
    expect(saved.weekdayHours[1]).toBe(0) // Monday = index 1
  })

  it('reverts to previous value when invalid input (> 24) is blurred', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WeeklyScheduleSettings repository={repo} />, { wrapper })
    const monInput = await screen.findByLabelText('Monday')
    await userEvent.tripleClick(monInput)
    await userEvent.keyboard('25')
    await userEvent.tab()
    expect(monInput).toHaveValue(8)
    const saved = await repo.get()
    expect(saved.weekdayHours[1]).toBe(8)
  })
})
