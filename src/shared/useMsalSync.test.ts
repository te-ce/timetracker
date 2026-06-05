import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { InteractionStatus, Logger, stubbedPublicClientApplication } from '@azure/msal-browser'
import type { AccountInfo } from '@azure/msal-browser'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
}))

vi.mock('../infra/repositories/shared', () => ({
  resetAllRepositories: vi.fn(),
}))

vi.mock('../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

import { useMsal } from '@azure/msal-react'
import { resetAllRepositories } from '../infra/repositories/shared'
import { useMsalSync } from './useMsalSync'
import { useAuthStore } from './authStore'

const mockUseMsal = vi.mocked(useMsal)
const mockResetAllRepositories = vi.mocked(resetAllRepositories)

const logger = new Logger({})

const emptyAccounts: AccountInfo[] = []
const noAccounts = {
  accounts: emptyAccounts,
  instance: stubbedPublicClientApplication,
  inProgress: InteractionStatus.None,
  logger,
}

function makeAccount(homeAccountId: string): AccountInfo {
  return {
    homeAccountId,
    localAccountId: homeAccountId,
    environment: 'login.microsoftonline.com',
    tenantId: 'tenant-id',
    username: 'user@example.com',
  }
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false })
  mockResetAllRepositories.mockClear()
})

describe('useMsalSync', () => {
  it('sets isAuthenticated to false when no accounts are present', () => {
    mockUseMsal.mockReturnValue(noAccounts)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('sets isAuthenticated to true when an account is present', () => {
    mockUseMsal.mockReturnValue({
      accounts: [makeAccount('user1')],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('resets repositories and invalidates queries when user signs in', () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.invalidateQueries = invalidateQueries

    mockUseMsal.mockReturnValue(noAccounts)
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockUseMsal.mockReturnValue({
      accounts: [makeAccount('user1')],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    })
    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('resets repositories and invalidates queries when user signs out', () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.invalidateQueries = invalidateQueries

    mockUseMsal.mockReturnValue({
      accounts: [makeAccount('user1')],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    })
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()
    invalidateQueries.mockClear()

    mockUseMsal.mockReturnValue(noAccounts)
    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('does not reset repositories when auth state stays false', () => {
    mockUseMsal.mockReturnValue(noAccounts)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()

    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).not.toHaveBeenCalled()
  })

  it('does not reset repositories when auth state stays true', () => {
    const account = makeAccount('user1')
    mockUseMsal.mockReturnValue({
      accounts: [account],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()

    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).not.toHaveBeenCalled()
  })
})
