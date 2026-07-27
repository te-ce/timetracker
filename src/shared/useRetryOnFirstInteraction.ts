import { useEffect, useRef } from 'react'

/**
 * Fires `retry` once, on the user's first pointerdown/keydown after `shouldRetry`
 * becomes true. Used to redo a fetch that needs a user gesture it didn't have on
 * its initial attempt (e.g. local-folder permission requests at startup).
 */
export function useRetryOnFirstInteraction(shouldRetry: boolean, retry: () => void): void {
  const retryRef = useRef(retry)

  useEffect(() => {
    retryRef.current = retry
  }, [retry])

  useEffect(() => {
    if (!shouldRetry) return
    const handler = () => {
      retryRef.current()
    }
    document.addEventListener('pointerdown', handler, { once: true })
    document.addEventListener('keydown', handler, { once: true })
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [shouldRetry])
}
