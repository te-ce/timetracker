import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { router } from './routes/router'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { useUndoStore } from './stores/undoStore'

function renderApp(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const memoryHistory = createMemoryHistory({ initialEntries: [path] })
  router.update({ history: memoryHistory })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

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

  it('renders all nav links', async () => {
    renderApp()
    expect(await screen.findByRole('link', { name: /month/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /grid/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /day/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sprint/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  it('renders theme toggle button', async () => {
    renderApp()
    const btn = await screen.findByRole('button', { name: /switch to (light|dark) mode/i })
    expect(btn).toBeInTheDocument()
  })

  it('toggles theme when theme button is clicked', async () => {
    useThemeStore.setState({ theme: 'light' })
    renderApp()
    const btn = await screen.findByRole('button', { name: /switch to dark mode/i })
    await userEvent.click(btn)
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('renders undo and redo buttons', async () => {
    renderApp()
    expect(await screen.findByRole('button', { name: /^undo$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^redo$/i })).toBeInTheDocument()
  })

  it('undo button is disabled when there is nothing to undo', async () => {
    useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
    renderApp()
    const undoBtn = await screen.findByRole('button', { name: /^undo$/i })
    expect(undoBtn).toBeDisabled()
  })

  it('renders keyboard shortcuts button', async () => {
    renderApp()
    const btn = await screen.findByRole('button', { name: /keyboard shortcuts/i })
    expect(btn).toBeInTheDocument()
  })

  it('opens keyboard shortcut legend when shortcut button is clicked', async () => {
    renderApp()
    const btn = await screen.findByRole('button', { name: /keyboard shortcuts/i })
    await userEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows sync indicator when msalInstance is not configured', async () => {
    renderApp()
    const indicator = await screen.findByLabelText(/local only mode/i)
    expect(indicator).toBeInTheDocument()
  })

  it('shows local only sync indicator (no msal configured)', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    renderApp()
    const indicator = await screen.findByLabelText(/local only mode/i)
    expect(indicator).toBeInTheDocument()
  })

  it('navigates to / when pressing the "d" hotkey', async () => {
    renderApp('/month')
    await screen.findByText('Timetracker')
    fireEvent.keyDown(document, { key: 'd' })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/')
    })
  })

  it('navigates to /grid when pressing the "g" hotkey', async () => {
    renderApp('/')
    await screen.findByText('Timetracker')
    fireEvent.keyDown(document, { key: 'g' })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/grid')
    })
  })

  it('ignores hotkeys when focus is in an input', async () => {
    renderApp('/grid')
    await screen.findByText('Timetracker')
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    // pressing 'm' (month hotkey) while inside an input should not navigate away
    fireEvent.keyDown(input, { key: 'm' })
    // pathname should remain on /grid, not have navigated to /
    await new Promise((r) => setTimeout(r, 50))
    expect(router.state.location.pathname).toBe('/grid')
    document.body.removeChild(input)
  })
})
