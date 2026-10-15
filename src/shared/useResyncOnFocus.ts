import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { flushPendingWrites, resetAllRepositories } from '../infra/repositories/shared'

/**
 * When the window regains focus or the network comes back: upload pending
 * writes, then drop the repository caches and refetch, so edits made on
 * another device show up instead of the cached copy from app start.
 */
export function useResyncOnFocus(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const resync = () => {
      void flushPendingWrites().then(() => {
        resetAllRepositories()
        return queryClient.invalidateQueries()
      })
    }
    window.addEventListener('focus', resync)
    window.addEventListener('online', resync)
    return () => {
      window.removeEventListener('focus', resync)
      window.removeEventListener('online', resync)
    }
  }, [queryClient])
}
