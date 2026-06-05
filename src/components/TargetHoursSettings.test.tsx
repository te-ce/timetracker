import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TargetHoursSettings } from './TargetHoursSettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('TargetHoursSettings', () => {
  it('shows current target hours', async () => {
    const repo = new InMemoryConfigRepository()
    render(<TargetHoursSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/target.*hours/i)
    expect(input).toHaveValue(8)
  })

  it('saves new value when user changes input and blurs', async () => {
    const repo = new InMemoryConfigRepository()
    render(<TargetHoursSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/target.*hours/i)
    await userEvent.tripleClick(input)
    await userEvent.keyboard('6')
    await userEvent.tab()
    const saved = await repo.get()
    expect(saved.sollstunden).toBe(6)
  })

  it('reverts to current value when invalid input is blurred', async () => {
    const repo = new InMemoryConfigRepository()
    render(<TargetHoursSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/target.*hours/i)
    await userEvent.tripleClick(input)
    await userEvent.keyboard('0')
    await userEvent.tab()
    expect(input).toHaveValue(8)
    const saved = await repo.get()
    expect(saved.sollstunden).toBe(8)
  })
})
