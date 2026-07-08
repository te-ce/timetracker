import { useEffect } from 'react'

/**
 * Fires `retry` once, on the user's first pointerdown/keydown after `shouldRetry`
 * becomes true. Used to redo a fetch that needs a user gesture it didn't have on
 * its initial attempt (e.g. local-folder permission requests at startup).
 */
export function useRetryOnFirstInteraction(shouldRetry: boolean, retry: () => void): void {
  useEffect(() => {
    if (!shouldRetry) return
    document.addEventListener('pointerdown', retry, { once: true })
    document.addEventListener('keydown', retry, { once: true })
    return () => {
      document.removeEventListener('pointerdown', retry)
      document.removeEventListener('keydown', retry)
    }
  }, [shouldRetry, retry])
}
