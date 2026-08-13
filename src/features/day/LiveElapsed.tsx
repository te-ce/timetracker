import { useEffect, useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { elapsedHoursSince } from '../../shared/worktime'
import type { TimeFormat } from '../../shared/timeFormatStore'

interface LiveElapsedProps {
  since: string
  timeFormat: TimeFormat
  tickMs?: number
}

/**
 * Owns its own fast ticking interval so a live elapsed display can update
 * every second without forcing the rest of the day view (which reads the
 * app's minute-grained `now`) to re-render.
 */
export function LiveElapsed({ since, timeFormat, tickMs = 1000 }: LiveElapsedProps) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), tickMs)
    return () => clearInterval(id)
  }, [tickMs])
  return <>{formatHours(elapsedHoursSince(since, new Date()), timeFormat)}</>
}
