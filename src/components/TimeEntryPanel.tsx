import { useEffect, useState } from 'react'
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
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [draft, setDraft] = useState<Partial<Record<Category, string>>>({})
  const [loadKey, setLoadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const d = new Date(date)
    void repository.findByDateRange(d, d).then((loaded) => {
      if (!cancelled) setEntries(loaded)
    })
    return () => { cancelled = true }
  }, [date, repository, loadKey])

  async function handleSave(category: Category) {
    const raw = draft[category] ?? ''
    const hours = parseFloat(raw)
    const existing = findEntry(entries, category)

    if (isNaN(hours) || hours === 0) {
      if (existing) await repository.delete(existing.id)
    } else {
      await repository.save({
        id: existing?.id ?? crypto.randomUUID(),
        date,
        category,
        hours,
      })
    }

    setDraft((d) => ({ ...d, [category]: undefined }))
    setLoadKey((k) => k + 1)
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
                onBlur={() => void handleSave(category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave(category)
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
