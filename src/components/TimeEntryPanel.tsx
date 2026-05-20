import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TimeEntry, TimeEntryRepository } from '../repositories/types'
import { getAllCategories } from '../domain/categories'
import { useTimeEntryMutations } from '../hooks/useTimeEntryMutations'

interface Props {
  date: string
  repository: TimeEntryRepository
  customCategories?: string[]
  autoCategory?: string | null
  autoCategoryHours?: number
}

function findEntry(entries: TimeEntry[], category: string): TimeEntry | undefined {
  return entries.find((e) => e.category === category)
}

export function TimeEntryPanel({ date, repository, customCategories = [], autoCategory = null, autoCategoryHours = 0 }: Props) {
  const [draft, setDraft] = useState<Record<string, string | undefined>>({})

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', date],
    queryFn: () => {
      const d = new Date(date)
      return repository.findByDateRange(d, d)
    },
  })

  const { save: saveMutation, remove: deleteMutation } = useTimeEntryMutations(repository)

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
        {getAllCategories(customCategories).map((category) => {
          const existing = findEntry(entries, category)
          const isAutoTarget = autoCategory === category
          const autoHrs = isAutoTarget ? autoCategoryHours : 0
          const manualHours = existing?.hours ?? 0
          const displayTotal = manualHours + autoHrs
          const value = draft[category] ?? (existing ? String(existing.hours) : '')

          return (
            <li
              key={category}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 shadow-sm ${isAutoTarget && autoHrs > 0 ? 'border-indigo-300 bg-indigo-50' : 'bg-white'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{category}</span>
                {isAutoTarget && autoHrs > 0 && (
                  <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                    +{autoHrs.toFixed(2)} auto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
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
