import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderSection } from './SettingsSections'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('ScheduleCategoriesSection', () => {
  it('persists preferCategoryDescriptionAsPrimary when the toggle is switched on', async () => {
    const repo = new InMemoryConfigRepository()
    render(<>{renderSection('schedule-categories', repo)}</>, { wrapper })
    const switchEl = await screen.findByRole('switch', { name: /show category description as primary/i })
    expect(switchEl).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(switchEl)
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.preferCategoryDescriptionAsPrimary).toBe(true)
    })
  })
})
