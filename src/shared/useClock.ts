import { useState, useEffect } from 'react'
import { nowHHMM } from './worktime'

const MINUTE = 60_000

/**
 * The app's clock seam: local wall-clock time as "HH:MM", always read fresh
 * at render time. The interval only forces a re-render every minute while
 * `enabled` — it never caches `now` itself, so a render triggered by
 * something else (e.g. stopping a work period) never sees a stale value.
 * Every live-updating view reads `now` from here so they all tick off the
 * same cadence instead of each keeping a private interval.
 */
export function useClock(enabled = true, tickMs = MINUTE): string {
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => forceTick((t) => t + 1), tickMs)
    return () => clearInterval(id)
  }, [enabled, tickMs])
  return nowHHMM()
}
