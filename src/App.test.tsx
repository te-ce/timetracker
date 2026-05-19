import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { router } from './routes/router'

describe('App', () => {
  it('renders the app shell with navigation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const memoryHistory = createMemoryHistory({ initialEntries: ['/'] })
    router.update({ history: memoryHistory })

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Timetracker')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
