import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
}))

vi.mock('../repositories/shared', () => ({
  resetAllRepositories: vi.fn(),
}))

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

import { useMsal } from '@azure/msal-react'
import { resetAllRepositories } from '../repositories/shared'
import { useMsalSync } from './useMsalSync'
import { useAuthStore } from '../stores/authStore'

const mockUseMsal = vi.mocked(useMsal)
const mockResetAllRepositories = vi.mocked(resetAllRepositories)

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
    mockUseMsal.mockReturnValue({ accounts: [], instance: {} as unknown as never, inProgress: 'none' } as unknown as ReturnType<typeof useMsal>)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('sets isAuthenticated to true when an account is present', () => {
    mockUseMsal.mockReturnValue({
      accounts: [{ homeAccountId: 'user1', username: 'user@example.com' } as unknown as never],
      instance: {} as unknown as never,
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('resets repositories and invalidates queries when user signs in', () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.invalidateQueries = invalidateQueries

    // Start unauthenticated
    mockUseMsal.mockReturnValue({ accounts: [], instance: {} as unknown as never, inProgress: 'none' } as unknown as ReturnType<typeof useMsal>)
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    // Sign in
    mockUseMsal.mockReturnValue({
      accounts: [{ homeAccountId: 'user1' } as unknown as never],
      instance: {} as unknown as never,
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    act(() => { rerender() })

    expect(mockResetAllRepositories).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('resets repositories and invalidates queries when user signs out', () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.invalidateQueries = invalidateQueries

    // Start authenticated
    mockUseMsal.mockReturnValue({
      accounts: [{ homeAccountId: 'user1' } as unknown as never],
      instance: {} as unknown as never,
      inProgress: 'none',
    } as unknown as ReturnType<typeof useMsal>)
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()
    invalidateQueries.mockClear()

    // Sign out
    mockUseMsal.mockReturnValue({ accounts: [], instance: {} as unknown as never, inProgress: 'none' } as unknown as ReturnType<typeof useMsal>)
    act(() => { rerender() })

    expect(mockResetAllRepositories).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('does not reset repositories when auth state stays false', () => {
    mockUseMsal.mockReturnValue({ accounts: [], instance: {} as unknown as never, inProgress: 'none' } as unknown as ReturnType<typeof useMsal>)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()

    // Stay unauthenticated
    act(() => { rerender() })

    expect(mockResetAllRepositories).not.toHaveBeenCalled()
  })

  it('does not reset repositories when auth state stays true', () => {
    const account = { homeAccountId: 'user1' } as unknown as never
    mockUseMsal.mockReturnValue({ accounts: [account], instance: {} as unknown as never, inProgress: 'none' } as unknown as ReturnType<typeof useMsal>)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useMsalSync(), { wrapper: makeWrapper(queryClient) })

    mockResetAllRepositories.mockClear()

    // Stay authenticated
    act(() => { rerender() })

    expect(mockResetAllRepositories).not.toHaveBeenCalled()
  })
})
