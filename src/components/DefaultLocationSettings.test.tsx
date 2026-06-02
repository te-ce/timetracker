import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DefaultLocationSettings } from './DefaultLocationSettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import { DEFAULT_APP_CONFIG as defaultAppConfig } from '../domain/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('DefaultLocationSettings', () => {
  it('renders Remote and Office buttons', async () => {
    const repo = new InMemoryConfigRepository()
    render(<DefaultLocationSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('button', { name: /remote/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /office/i })).toBeInTheDocument()
  })

  it('highlights Remote by default when no location is configured', async () => {
    const repo = new InMemoryConfigRepository()
    render(<DefaultLocationSettings repository={repo} />, { wrapper })
    const remoteBtn = await screen.findByRole('button', { name: /remote/i })
    expect(remoteBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights Office when defaultWorkLocation is Office', async () => {
    const repo = new InMemoryConfigRepository({ ...defaultAppConfig, defaultWorkLocation: 'Office' })
    render(<DefaultLocationSettings repository={repo} />, { wrapper })
    const officeBtn = await screen.findByRole('button', { name: /office/i })
    expect(officeBtn).toHaveClass('bg-indigo-600')
  })

  it('saves Office when Office button is clicked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<DefaultLocationSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('button', { name: /office/i }))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.defaultWorkLocation).toBe('Office')
    })
  })

  it('saves Remote when Remote button is clicked after Office was selected', async () => {
    const repo = new InMemoryConfigRepository({ ...defaultAppConfig, defaultWorkLocation: 'Office' })
    render(<DefaultLocationSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('button', { name: /remote/i }))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.defaultWorkLocation).toBe('Remote')
    })
  })
})
