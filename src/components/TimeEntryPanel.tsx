import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, TimeEntryRepository, Category } from '../repositories/types'
import { CATEGORIES } from '../repositories/types'

interface Props {
  date: string
  repository: TimeEntryRepository
}

function findEntry(entries: TimeEntry[], category: Category): TimeEntry | undefined {
  return entries.find((e) => e.category === category)
}

export function TimeEntryPanel({ date, repository }: Props) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Partial<Record<Category, string>>>({})

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', date],
    queryFn: () => {
      const d = new Date(date)
      return repository.findByDateRange(d, d)
    },
  })

  const saveMutation = useMutation({
    mutationFn: (entry: TimeEntry) => repository.save(entry),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['timeEntries', date] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['timeEntries', date] }),
  })

  function handleSave(category: Category) {
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

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

  return (
    <section aria-label="Time entries" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {CATEGORIES.map((category) => {
          const existing = findEntry(entries, category)
          const value = draft[category] ?? (existing ? String(existing.hours) : '')

          return (
            <li
              key={category}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5 shadow-sm"
            >
              <span className="text-sm font-medium">{category}</span>
              <input
                aria-label={`Hours for ${category}`}
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={value}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [category]: e.target.value }))
                }
                onBlur={() => handleSave(category)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave(category)
                }}
                className="w-20 rounded border px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
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
