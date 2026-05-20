import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, TimeEntryRepository, TimeTrackingRepository, WorkWindowRepository } from '../repositories/types'
import { getAllCategories } from '../domain/categories'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'

interface Props {
  date: string
  repository: TimeEntryRepository
  timeTrackingRepository: TimeTrackingRepository
  workWindowRepository?: WorkWindowRepository
  customCategories?: string[]
  categoryOrder?: string[]
  autoCategory?: string | null
  autoCategoryHours?: number
}

function findEntry(entries: TimeEntry[], category: string): TimeEntry | undefined {
  return entries.find((e) => e.category === category)
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TimeEntryPanel({ date, repository, timeTrackingRepository, workWindowRepository, customCategories = [], categoryOrder, autoCategory = null, autoCategoryHours = 0 }: Props) {
  const [draft, setDraft] = useState<Record<string, string | undefined>>({})
  const [tick, setTick] = useState(0)

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', date],
    queryFn: () => {
      const d = new Date(date)
      return repository.findByDateRange(d, d)
    },
  })

  const { data: activeTracking = null } = useQuery({
    queryKey: ['activeTracking'],
    queryFn: () => timeTrackingRepository.getActive(),
  })

  // Tick every second to update elapsed display
  useEffect(() => {
    if (!activeTracking) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTracking])

  const queryClient = useQueryClient()
  const { save: saveMutation, remove: deleteMutation } = useTimeEntryMutations(repository)

  function nowHHMM(): string {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  async function openWorkWindow(trackingDate: string): Promise<void> {
    if (!workWindowRepository) return
    const existing = await workWindowRepository.findByDate(new Date(trackingDate))
    if (existing.some((w) => w.end === null)) return
    await workWindowRepository.save({ id: crypto.randomUUID(), date: trackingDate, start: nowHHMM(), end: null })
  }

  async function closeLatestOpenWorkWindow(trackingDate: string): Promise<void> {
    if (!workWindowRepository) return
    const windows = await workWindowRepository.findByDate(new Date(trackingDate))
    const open = windows.filter((w) => w.end === null)
    if (open.length === 0) return
    const latest = open.reduce((a, b) => (a.start > b.start ? a : b))
    await workWindowRepository.save({ ...latest, end: nowHHMM() })
  }

  const startTrackingMutation = useMutation({
    mutationFn: async (category: string) => {
      // Stop any active tracking first
      const stopped = await timeTrackingRepository.stop()
      if (stopped && stopped.hours > 0) {
        const existing = entries.find((e) => e.category === stopped.category && e.date === stopped.date)
        await repository.save({
          id: existing?.id ?? crypto.randomUUID(),
          date: stopped.date,
          category: stopped.category,
          hours: Math.round(((existing?.hours ?? 0) + stopped.hours) * 100) / 100,
        })
      }
      // Don't close open WorkWindow when switching categories — it spans the whole session
      await timeTrackingRepository.start(date, category)
      await openWorkWindow(date)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activeTracking'] })
      void queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      void queryClient.invalidateQueries({ queryKey: ['workWindows'] })
    },
  })

  const stopTrackingMutation = useMutation({
    mutationFn: async () => {
      const active = await timeTrackingRepository.getActive()
      const stopped = await timeTrackingRepository.stop()
      if (stopped && stopped.hours > 0) {
        const existing = entries.find((e) => e.category === stopped.category && e.date === stopped.date)
        await repository.save({
          id: existing?.id ?? crypto.randomUUID(),
          date: stopped.date,
          category: stopped.category,
          hours: Math.round(((existing?.hours ?? 0) + stopped.hours) * 100) / 100,
        })
      }
      if (active) await closeLatestOpenWorkWindow(active.date)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activeTracking'] })
      void queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      void queryClient.invalidateQueries({ queryKey: ['workWindows'] })
    },
  })

  function handleSave(category: string) {
    const raw = draft[category] ?? ''
    const hours = parseFloat(raw)
    const existing = findEntry(entries, category)

    if (isNaN(hours) || hours === 0) {
      if (existing) deleteMutation.mutate(existing.id)
    } else {
      saveMutation.mutate({
        id: existing?.id ?? crypto.randomUUID(),
        date,
        category,
        hours,
      })
    }

    setDraft((d) => ({ ...d, [category]: undefined }))
  }

  function handleIncrement(category: string, delta: number) {
    const existing = findEntry(entries, category)
    const current = existing?.hours ?? 0
    const newHours = Math.max(0, current + delta)

    if (newHours === 0) {
      if (existing) deleteMutation.mutate(existing.id)
    } else {
      saveMutation.mutate({
        id: existing?.id ?? crypto.randomUUID(),
        date,
        category,
        hours: newHours,
      })
    }
    setDraft((d) => ({ ...d, [category]: undefined }))
  }

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0) + autoCategoryHours

  return (
    <section aria-label="Time entries" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {getAllCategories(customCategories, categoryOrder).map((category) => {
          const existing = findEntry(entries, category)
          const isAutoTarget = autoCategory === category
          const autoHrs = isAutoTarget ? autoCategoryHours : 0
          const manualHours = existing?.hours ?? 0
          const displayTotal = manualHours + autoHrs
          const value = draft[category] ?? (existing ? String(existing.hours) : '')
          const isTracking = activeTracking?.category === category && activeTracking?.date === date

          return (
            <li
              key={category}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 shadow-sm ${isTracking ? 'border-green-400 bg-green-50' : isAutoTarget && autoHrs > 0 ? 'border-indigo-300 bg-indigo-50' : 'bg-white'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{category}</span>
                {isAutoTarget && autoHrs > 0 && (
                  <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                    +{autoHrs.toFixed(2)} auto
                  </span>
                )}
                {isTracking && (
                  <span className="rounded bg-green-200 px-1.5 py-0.5 text-[10px] font-bold text-green-800 tabular-nums">
                    ⏱ {formatElapsed(activeTracking!.startedAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isTracking ? (
                  <button
                    aria-label={`Stop tracking ${category}`}
                    onClick={() => stopTrackingMutation.mutate()}
                    className="rounded border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    ⏹ Stop
                  </button>
                ) : (
                  <button
                    aria-label={`Start tracking ${category}`}
                    onClick={() => startTrackingMutation.mutate(category)}
                    className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                  >
                    ▶ Start
                  </button>
                )}
                <button
                  aria-label={`Decrease ${category}`}
                  onClick={() => handleIncrement(category, -0.25)}
                  className="rounded border px-2 py-0.5 text-sm font-bold hover:bg-gray-100"
                >
                  −
                </button>
                <input
                  aria-label={`Hours for ${category}`}
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="0"
                  value={value}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [category]: e.target.value }))
                  }
                  onBlur={() => handleSave(category)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(category)
                  }}
                  className="w-16 rounded border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  aria-label={`Increase ${category}`}
                  onClick={() => handleIncrement(category, 0.25)}
                  className="rounded border px-2 py-0.5 text-sm font-bold hover:bg-gray-100"
                >
                  +
                </button>
                {isAutoTarget && autoHrs > 0 && (
                  <span className="ml-1 text-xs text-gray-500">= {displayTotal.toFixed(2)}</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {totalHours > 0 && (
        <div
          aria-label="Total booked hours"
          className="rounded-lg border bg-indigo-50 px-4 py-3 text-right text-sm font-semibold"
        >
          Total: {totalHours}h
        </div>
      )}
    </section>
  )
}
