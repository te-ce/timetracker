import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { InteractionStatus, Logger, stubbedPublicClientApplication } from '@azure/msal-browser'
import type { AccountInfo } from '@azure/msal-browser'

import { MsalContext } from '@azure/msal-react'
import type { IMsalContext } from '@azure/msal-react'
import { useMsalSync } from './useMsalSync'
import { useAuthStore } from './authStore'

const mockResetAllRepositories = vi.fn()

const logger = new Logger({})

const emptyAccounts: AccountInfo[] = []
const noAccounts = {
  accounts: emptyAccounts,
  instance: stubbedPublicClientApplication,
  inProgress: InteractionStatus.None,
  logger,
}

let currentMsal: IMsalContext = noAccounts

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
    return createElement(
      MsalContext.Provider,
      { value: currentMsal },
      createElement(QueryClientProvider, { client: queryClient }, children),
    )
  }
}

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false })
  mockResetAllRepositories.mockClear()
})

describe('useMsalSync', () => {
  it('sets isAuthenticated to false when no accounts are present', () => {
    currentMsal = noAccounts
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMsalSync(mockResetAllRepositories), { wrapper: makeWrapper(queryClient) })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('sets isAuthenticated to true when an account is present', () => {
    currentMsal = {
      accounts: [makeAccount('user1')],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMsalSync(mockResetAllRepositories), { wrapper: makeWrapper(queryClient) })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('resets repositories and invalidates queries when user signs in', () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.invalidateQueries = invalidateQueries

    currentMsal = noAccounts
    const { rerender } = renderHook(() => useMsalSync(mockResetAllRepositories), { wrapper: makeWrapper(queryClient) })

    currentMsal = {
      accounts: [makeAccount('user1')],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    }
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

    currentMsal = {
      accounts: [makeAccount('user1')],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    }
    const { rerender } = renderHook(() => useMsalSync(mockResetAllRepositories), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()
    invalidateQueries.mockClear()

    currentMsal = noAccounts
    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('does not reset repositories when auth state stays false', () => {
    currentMsal = noAccounts
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useMsalSync(mockResetAllRepositories), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()

    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).not.toHaveBeenCalled()
  })

  it('does not reset repositories when auth state stays true', () => {
    const account = makeAccount('user1')
    currentMsal = {
      accounts: [account],
      instance: stubbedPublicClientApplication,
      inProgress: InteractionStatus.None,
      logger,
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useMsalSync(mockResetAllRepositories), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()

    act(() => {
      rerender()
    })

    expect(mockResetAllRepositories).not.toHaveBeenCalled()
  })
})
