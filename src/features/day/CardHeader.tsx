import { useState, useRef, useEffect } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { isAfter, nowHHMM } from '../../shared/worktime'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import type { LiveSubtask } from './workPeriodShared'

function headerBg(isRunning: boolean): string {
  if (isRunning) return 'bg-green-50 dark:bg-green-900/20'
  return 'bg-gray-50 dark:bg-gray-800/60'
}

interface CardHeaderProps {
  w: WorkPeriod
  date: string
  duration: number
  isRunning: boolean
  liveSubtask: LiveSubtask | undefined
  mutations: ReturnType<typeof useWorkPeriodMutations>
}

export function CardHeader({ w, date, duration, isRunning, liveSubtask, mutations }: CardHeaderProps) {
  const [editingTime, setEditingTime] = useState(false)
  const [editStart, setEditStart] = useState(w.start)
  const [editEnd, setEditEnd] = useState(w.end ?? '')
  const [timeError, setTimeError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)
  const focusEndRef = useRef(false)
  const timeFormat = useTimeFormatStore((s) => s.format)

  useEffect(() => {
    if (!editingTime) return
    if (focusEndRef.current) {
      endInputRef.current?.focus()
    } else {
      startInputRef.current?.focus()
    }
  }, [editingTime])

  function enterEditMode(focusEnd: boolean) {
    setEditStart(w.start)
    setEditEnd(w.end ?? (focusEnd ? nowHHMM() : ''))
    setTimeError(null)
    focusEndRef.current = focusEnd
    setEditingTime(true)
  }

  function saveTime() {
    if (isRunning && editEnd) {
      const baseTime = liveSubtask && isAfter(liveSubtask.startedAt, w.start) ? liveSubtask.startedAt : w.start
      if (!isAfter(editEnd, baseTime)) {
        setTimeError(`Must be after ${baseTime}`)
        return
      }
      mutations.stopPeriod.mutate({
        date,
        periodId: w.id,
        endTime: editEnd,
        liveSubtaskId: liveSubtask?.id,
        stoppedAt: liveSubtask ? editEnd : undefined,
      })
      setEditingTime(false)
      return
    }
    mutations.saveWithAbsorbed.mutate({ date, window: { ...w, start: editStart, end: editEnd || null }, absorbed: [] })
    setEditingTime(false)
  }

  const showStopButton = isRunning

  return (
    <>
      <div data-testid="period-card-header" className={`px-4 py-3 ${headerBg(isRunning)}`}>
        <div className="relative flex items-center justify-center min-h-[2rem]">
          <span
            data-testid="period-duration"
            className="absolute left-0 w-12 font-mono text-sm font-medium tabular-nums text-right text-gray-500 dark:text-gray-400"
          >
            {formatHours(duration, timeFormat)}
          </span>
          <div className="min-w-0 flex justify-center">
            {editingTime ? (
              <div
                className="relative flex items-center gap-1 flex-wrap"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) saveTime()
                }}
              >
                <input
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTime()
                    if (e.key === 'Escape') setEditingTime(false)
                  }}
                  aria-label="Edit start time"
                  ref={startInputRef}
                  className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
                <span className="text-gray-400 text-sm">–</span>
                <input
                  type="time"
                  value={editEnd}
                  onChange={(e) => {
                    setEditEnd(e.target.value)
                    setTimeError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTime()
                    if (e.key === 'Escape') setEditingTime(false)
                  }}
                  aria-label="Edit end time"
                  ref={endInputRef}
                  className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
                {timeError && (
                  <span className="absolute top-full left-0 mt-0.5 text-xs text-red-600 dark:text-red-400 whitespace-nowrap bg-white dark:bg-gray-800 rounded shadow px-1 z-10">
                    {timeError}
                  </span>
                )}
                <button
                  type="button"
                  onClick={saveTime}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium ml-1"
                >
                  Save
                </button>
                <button type="button" onClick={() => setEditingTime(false)} className="text-xs text-gray-400 ml-1">
                  Cancel
                </button>
              </div>
            ) : (
              <span className="group/time flex items-center gap-1.5 font-mono text-base font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => enterEditMode(false)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                  aria-label={`Edit start time ${w.start}`}
                >
                  {w.start}
                </button>
                <span className="text-gray-400 font-normal text-sm">–</span>
                <button
                  type="button"
                  onClick={() => enterEditMode(true)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                  aria-label={`Edit end time ${w.end ?? 'open end'}`}
                >
                  {w.end ?? '--:--'}
                </button>
              </span>
            )}
          </div>
          <div className="absolute right-0 flex items-center gap-2">
            {showStopButton && !editingTime && (
              <button
                type="button"
                onClick={() => enterEditMode(true)}
                aria-label="Stop tracking"
                className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium border border-red-200 dark:border-red-800 rounded px-2 py-1"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-lg leading-none p-1 rounded"
              aria-label="Remove period"
            >
              ×
            </button>
          </div>
        </div>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete period?"
          message={`Are you sure you want to delete the period ${w.start} – ${w.end ?? '--:--'}?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            mutations.remove.mutate({ date, id: w.id })
            setConfirmingDelete(false)
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
