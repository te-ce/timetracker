import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MsalContext } from '@azure/msal-react'
import type { IMsalContext } from '@azure/msal-react'
import type { ReactElement } from 'react'
import { useAuthStore } from '../../shared/authStore'

const BOOTSTRAP_KEY = 'msal-bootstrap-config'
localStorage.setItem(BOOTSTRAP_KEY, JSON.stringify({ clientId: 'test-client', tenantId: 'test-tenant' }))
const { CloudSyncSettings } = await import('./CloudSyncSettings')
localStorage.removeItem(BOOTSTRAP_KEY)

const mockInstance = {
  loginPopup: vi.fn(),
  logoutPopup: vi.fn(),
}

const signedIn = [{ username: 'user@example.com' }]

function renderWithMsal(ui: ReactElement, accounts: readonly object[] = []) {
  const value = { instance: mockInstance, accounts, inProgress: 'none' } as unknown as IMsalContext
  return render(<MsalContext.Provider value={value}>{ui}</MsalContext.Provider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: false })
  localStorage.setItem(BOOTSTRAP_KEY, 'configured')
})

describe('CloudSyncSettings', () => {
  it('shows offline state and Sign in button when not authenticated', () => {
    renderWithMsal(<CloudSyncSettings />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument()
  })

  it('shows synced state and account name when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true })
    renderWithMsal(<CloudSyncSettings />, signedIn)
    expect(screen.getByText(/synced with onedrive/i)).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('shows Change Azure AD configuration button in both states', () => {
    renderWithMsal(<CloudSyncSettings />)
    expect(screen.getByRole('button', { name: /change azure ad configuration/i })).toBeInTheDocument()
  })

  it('clears the bootstrap config when Change Azure AD configuration is clicked', async () => {
    const originalReload = window.location.reload.bind(window.location)
    Object.defineProperty(window.location, 'reload', { value: vi.fn(), writable: true, configurable: true })
    renderWithMsal(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /change azure ad configuration/i }))
    expect(localStorage.getItem(BOOTSTRAP_KEY)).toBeNull()
    Object.defineProperty(window.location, 'reload', {
      value: originalReload,
      writable: true,
      configurable: true,
    })
  })

  it('calls instance.loginPopup when Sign in is clicked', async () => {
    mockInstance.loginPopup.mockResolvedValue(undefined)
    renderWithMsal(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with microsoft/i }))
    expect(mockInstance.loginPopup).toHaveBeenCalledOnce()
  })

  it('handles loginPopup rejection gracefully', async () => {
    mockInstance.loginPopup.mockRejectedValue(new Error('popup blocked'))
    renderWithMsal(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with microsoft/i }))
    expect(mockInstance.loginPopup).toHaveBeenCalledOnce()
  })

  it('calls instance.logoutPopup when Sign out is clicked', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    mockInstance.logoutPopup.mockResolvedValue(undefined)
    renderWithMsal(<CloudSyncSettings />, signedIn)
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockInstance.logoutPopup).toHaveBeenCalledOnce()
  })

  it('handles logoutPopup rejection gracefully', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    mockInstance.logoutPopup.mockRejectedValue(new Error('logout failed'))
    renderWithMsal(<CloudSyncSettings />, signedIn)
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockInstance.logoutPopup).toHaveBeenCalledOnce()
  })

  it('clears the bootstrap config when Change Azure AD configuration is clicked while authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    const originalReload = window.location.reload.bind(window.location)
    Object.defineProperty(window.location, 'reload', { value: vi.fn(), writable: true, configurable: true })
    renderWithMsal(<CloudSyncSettings />, signedIn)
    await userEvent.click(screen.getByRole('button', { name: /change azure ad configuration/i }))
    expect(localStorage.getItem(BOOTSTRAP_KEY)).toBeNull()
    Object.defineProperty(window.location, 'reload', {
      value: originalReload,
      writable: true,
      configurable: true,
    })
  })
})
