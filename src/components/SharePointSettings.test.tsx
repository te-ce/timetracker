import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SharePointSettings } from './SharePointSettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import { DEFAULT_APP_CONFIG as defaultAppConfig } from '../domain/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('SharePointSettings', () => {
  it('renders with an empty URL input when no URL is configured', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SharePointSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/sharepoint workbook url/i)
    expect(input).toHaveValue('')
  })

  it('shows the configured URL in the input', async () => {
    const url = 'https://company.sharepoint.com/sites/team/timetracking.xlsx'
    const repo = new InMemoryConfigRepository({ ...defaultAppConfig, sharepointUrl: url })
    render(<SharePointSettings repository={repo} />, { wrapper })
    await waitFor(() => {
      const input = screen.getByLabelText(/sharepoint workbook url/i)
      expect(input).toHaveValue(url)
    })
  })

  it('reveals the Save button when the URL is changed', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SharePointSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/sharepoint workbook url/i)
    await userEvent.type(input, 'https://example.sharepoint.com/foo.xlsx')
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('saves the URL when the Save button is clicked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SharePointSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/sharepoint workbook url/i)
    const newUrl = 'https://example.sharepoint.com/foo.xlsx'
    await userEvent.type(input, newUrl)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.sharepointUrl).toBe(newUrl)
    })
  })

  it('saves the URL on blur when the field is dirty', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SharePointSettings repository={repo} />, { wrapper })
    const input = await screen.findByLabelText(/sharepoint workbook url/i)
    const newUrl = 'https://example.sharepoint.com/blur.xlsx'
    await userEvent.type(input, newUrl)
    await userEvent.tab()
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.sharepointUrl).toBe(newUrl)
    })
  })

  it('shows a confirmation indicator after a URL is saved', async () => {
    const url = 'https://company.sharepoint.com/sites/team/timetracking.xlsx'
    const repo = new InMemoryConfigRepository({ ...defaultAppConfig, sharepointUrl: url })
    render(<SharePointSettings repository={repo} />, { wrapper })
    expect(await screen.findByText(new RegExp(url))).toBeInTheDocument()
  })
})
