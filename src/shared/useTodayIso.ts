import { useState, useEffect } from 'react'
import { toLocalIso } from './dateUtils'

export function useTodayIso(): string {
  const [todayIso, setTodayIso] = useState(() => toLocalIso(new Date()))

  useEffect(() => {
    function update() {
      setTodayIso(toLocalIso(new Date()))
    }

    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const id = setTimeout(update, tomorrow.getTime() - now.getTime())

    document.addEventListener('visibilitychange', update)
    return () => {
      clearTimeout(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [todayIso])

  return todayIso
}
