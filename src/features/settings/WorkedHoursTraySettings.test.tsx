import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkedHoursTraySettings } from './WorkedHoursTraySettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('WorkedHoursTraySettings', () => {
  it('renders toggle for showing worked hours in tray', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WorkedHoursTraySettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is checked by default (worked hours shown in tray)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WorkedHoursTraySettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('is unchecked when showWorkedHoursInTray is false in config', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showWorkedHoursInTray: false })
    render(<WorkedHoursTraySettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('saves showWorkedHoursInTray=false when unchecked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WorkedHoursTraySettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showWorkedHoursInTray).toBe(false)
    })
  })

  it('saves showWorkedHoursInTray=true when re-checked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showWorkedHoursInTray: false })
    render(<WorkedHoursTraySettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showWorkedHoursInTray).toBe(true)
    })
  })
})
