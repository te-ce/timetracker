import { useEffect, useRef } from 'react'
import { useMsal } from '@azure/msal-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './authStore'
import { resetAllRepositories } from '../infra/repositories/shared'

/**
 * Watches MSAL account state and keeps authStore.isAuthenticated in sync.
 * When the user signs in, clears all repository caches and invalidates
 * all React Query queries so data is re-fetched from OneDrive.
 */
export function useMsalSync() {
  const { accounts } = useMsal()
  const queryClient = useQueryClient()
  const setIsAuthenticated = useAuthStore((s) => s.setIsAuthenticated)
  const prevAuthRef = useRef<boolean | null>(null)

  useEffect(() => {
    const authenticated = accounts.length > 0
    setIsAuthenticated(authenticated)

    if (authenticated && prevAuthRef.current === false) {
      // User just signed in — bust caches so next reads come from OneDrive
      resetAllRepositories()
      void queryClient.invalidateQueries()
    }

    if (!authenticated && prevAuthRef.current === true) {
      // User signed out — clear cached OneDrive data
      resetAllRepositories()
      void queryClient.invalidateQueries()
    }

    prevAuthRef.current = authenticated
  }, [accounts, setIsAuthenticated, queryClient])
}
