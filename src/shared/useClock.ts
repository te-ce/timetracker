import { useState, useEffect } from 'react'
import { nowHHMM } from './worktime'

const MINUTE = 60_000

/**
 * The app's clock seam: local wall-clock time as "HH:MM", re-read every
 * minute while `enabled`. Every live-updating view reads `now` from here so
 * they all tick off the same value instead of each keeping a private
 * `nowHHMM` and its own interval.
 */
export function useClock(enabled = true, tickMs = MINUTE): string {
  const [now, setNow] = useState(nowHHMM)
  useEffect(() => {
    if (!enabled) return
    setNow(nowHHMM())
    const id = setInterval(() => setNow(nowHHMM()), tickMs)
    return () => clearInterval(id)
  }, [enabled, tickMs])
  return now
}
