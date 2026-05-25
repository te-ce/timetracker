import { useEffect, useRef } from 'react'
import { useRemainingHours } from './useRemainingHours'

export function crossedGoal(prev: number | null, current: number): boolean {
  return prev !== null && prev > 0 && current <= 0
}

export function useGoalNotification() {
  const { remaining } = useRemainingHours()
  const prevRef = useRef<number | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = remaining

    if (!crossedGoal(prev, remaining)) return

    if (window.electronAPI) {
      window.electronAPI.notify.goalReached()
    } else if ('Notification' in window) {
      void Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('Timetracker', { body: "You've reached your daily target!" })
        }
      })
    }
  }, [remaining])
}
