import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
}))

vi.mock('../auth/msalInstance', () => ({
  graphScopes: ['User.Read'],
  msalInstance: {},
}))

vi.mock('../auth/bootstrapConfig', () => ({
  clearBootstrapConfig: vi.fn(),
}))

import { useMsal } from '@azure/msal-react'
import { useAuthStore } from '../stores/authStore'
import { clearBootstrapConfig } from '../auth/bootstrapConfig'
import { CloudSyncSettings } from './CloudSyncSettings'

const mockUseMsal = vi.mocked(useMsal)
const mockClearBootstrapConfig = vi.mocked(clearBootstrapConfig)

const mockInstance = {
  loginPopup: vi.fn(),
  logoutPopup: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: false })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  mockUseMsal.mockReturnValue({
    instance: mockInstance,
    accounts: [],
    inProgress: 'none',
  } as unknown as ReturnType<typeof useMsal>)
})

describe('CloudSyncSettings', () => {
  it('shows offline state and Sign in button when not authenticated', () => {
    render(<CloudSyncSettings />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument()
  })

  it('shows synced state and account name when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockUseMsal.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      accounts: [{ username: 'user@example.com' } as ReturnType<typeof useMsal>['accounts'][0]],
      instance: mockInstance,
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    render(<CloudSyncSettings />)
    expect(screen.getByText(/synced with onedrive/i)).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('shows Change Azure AD configuration button in both states', () => {
    render(<CloudSyncSettings />)
    expect(screen.getByRole('button', { name: /change azure ad configuration/i })).toBeInTheDocument()
  })

  it('calls clearBootstrapConfig when Change Azure AD configuration is clicked', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: vi.fn() },
      writable: true,
      configurable: true,
    })
    render(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /change azure ad configuration/i }))
    expect(mockClearBootstrapConfig).toHaveBeenCalledOnce()
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
  })

  it('calls instance.loginPopup when Sign in is clicked', async () => {
    mockInstance.loginPopup.mockResolvedValue(undefined)
    render(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with microsoft/i }))
    expect(mockInstance.loginPopup).toHaveBeenCalledOnce()
  })

  it('handles loginPopup rejection gracefully', async () => {
    mockInstance.loginPopup.mockRejectedValue(new Error('popup blocked'))
    render(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with microsoft/i }))
    expect(mockInstance.loginPopup).toHaveBeenCalledOnce()
  })

  it('calls instance.logoutPopup when Sign out is clicked', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockUseMsal.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      accounts: [{ username: 'user@example.com' } as ReturnType<typeof useMsal>['accounts'][0]],
      instance: mockInstance,
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    mockInstance.logoutPopup.mockResolvedValue(undefined)
    render(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockInstance.logoutPopup).toHaveBeenCalledOnce()
  })

  it('handles logoutPopup rejection gracefully', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockUseMsal.mockReturnValue({
      instance: mockInstance,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      accounts: [{ username: 'user@example.com' } as ReturnType<typeof useMsal>['accounts'][0]],
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    mockInstance.logoutPopup.mockRejectedValue(new Error('logout failed'))
    render(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockInstance.logoutPopup).toHaveBeenCalledOnce()
  })

  it('calls clearBootstrapConfig when Change Azure AD configuration is clicked while authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    mockUseMsal.mockReturnValue({
      instance: mockInstance,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      accounts: [{ username: 'user@example.com' } as ReturnType<typeof useMsal>['accounts'][0]],
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: vi.fn() },
      writable: true,
      configurable: true,
    })
    render(<CloudSyncSettings />)
    await userEvent.click(screen.getByRole('button', { name: /change azure ad configuration/i }))
    expect(mockClearBootstrapConfig).toHaveBeenCalledOnce()
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
  })
})
