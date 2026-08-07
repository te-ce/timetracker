import { useState, useRef, useEffect } from 'react'
import type { WorkPeriodSubtask } from '../../infra/repositories/types'

export type LiveSubtask = WorkPeriodSubtask & { startedAt: string; stoppedAt?: undefined }
export type TimedSubtask = WorkPeriodSubtask & { startedAt: string; stoppedAt: string }

export function isLiveSubtask(s: WorkPeriodSubtask): s is LiveSubtask {
  return !!s.startedAt && !s.stoppedAt
}

export function isTimedSubtask(s: WorkPeriodSubtask): s is TimedSubtask {
  return !!s.startedAt && !!s.stoppedAt
}

export function useBlurWarning(isDirty: boolean) {
  const [pendingCancel, setPendingCancel] = useState(false)
  const [cancelToken, setCancelToken] = useState(0)
  const containerRef = useRef<Element | null>(null)
  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  })

  useEffect(() => {
    if (!pendingCancel) return

    function handleMouseDown(e: MouseEvent) {
      if (!(e.target instanceof Node)) return
      const inside = containerRef.current?.contains(e.target) ?? false
      setPendingCancel(false)
      if (!inside) setCancelToken((t) => t + 1)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [pendingCancel])

  function handleBlur(e: React.FocusEvent) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (!isDirtyRef.current) {
        setCancelToken((t) => t + 1)
        return
      }
      containerRef.current = e.currentTarget
      setPendingCancel(true)
    }
  }

  function handleFocus() {
    setPendingCancel(false)
  }

  function reset() {
    setPendingCancel(false)
  }

  return { pendingCancel, handleBlur, handleFocus, reset, cancelToken }
}

export function BlurCancelHint() {
  return (
    <span className="absolute bottom-full left-0 mb-0.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-700 rounded px-2 py-0.5 whitespace-nowrap z-20 pointer-events-none shadow-sm select-none">
      Click outside again to cancel
    </span>
  )
}
