import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BooleanConfigToggle } from './BooleanConfigToggle'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const isChecked = (config: AppConfig) => config.officeStats !== false
const applyChange = (config: AppConfig, checked: boolean): AppConfig => ({ ...config, officeStats: checked })

describe('BooleanConfigToggle', () => {
  it('renders a checkbox reflecting isChecked', async () => {
    const repo = new InMemoryConfigRepository()
    render(
      <BooleanConfigToggle
        repository={repo}
        label="Show office stats"
        description="desc"
        isChecked={isChecked}
        applyChange={applyChange}
      />,
      { wrapper },
    )
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('reflects a false config value as unchecked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, officeStats: false })
    render(
      <BooleanConfigToggle
        repository={repo}
        label="Show office stats"
        description="desc"
        isChecked={isChecked}
        applyChange={applyChange}
      />,
      { wrapper },
    )
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('persists the change via applyChange when toggled', async () => {
    const repo = new InMemoryConfigRepository()
    render(
      <BooleanConfigToggle
        repository={repo}
        label="Show office stats"
        description="desc"
        isChecked={isChecked}
        applyChange={applyChange}
      />,
      { wrapper },
    )
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.officeStats).toBe(false)
    })
  })

  it('calls onAfterSave with the new checked value', async () => {
    const repo = new InMemoryConfigRepository()
    const onAfterSave = vi.fn().mockResolvedValue(undefined)
    render(
      <BooleanConfigToggle
        repository={repo}
        label="Launch at login"
        description="desc"
        isChecked={(c) => c.launchAtLogin ?? false}
        applyChange={(c, checked) => ({ ...c, launchAtLogin: checked })}
        onAfterSave={onAfterSave}
        variant="spaced"
      />,
      { wrapper },
    )
    await userEvent.click(await screen.findByRole('checkbox', { name: /launch at login/i }))
    await waitFor(() => {
      expect(onAfterSave).toHaveBeenCalledWith(true)
    })
  })

  it('shows an error message when saving fails', async () => {
    const repo = new InMemoryConfigRepository()
    repo.save = vi.fn().mockRejectedValue(new Error('network error'))
    render(
      <BooleanConfigToggle
        repository={repo}
        label="Show office stats"
        description="desc"
        isChecked={isChecked}
        applyChange={applyChange}
      />,
      { wrapper },
    )
    await userEvent.click(await screen.findByRole('checkbox'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to save setting/i)
  })
})
