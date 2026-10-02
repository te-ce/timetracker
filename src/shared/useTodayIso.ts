import { useState, useEffect } from 'react'
import { toLocalIso } from './dateUtils'

export function useTodayIso(): string {
  const [todayIso, setTodayIso] = useState(() => toLocalIso(new Date()))

  useEffect(() => {
    function update() {
      setTodayIso(toLocalIso(new Date()))
    }

    // Polls the wall clock instead of scheduling a timeout for midnight: timers
    // pause during system sleep, so a midnight timeout fires hours late.
    const id = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return todayIso
}
