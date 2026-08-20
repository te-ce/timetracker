import { useState } from 'react'
import { CategoryPicker } from './CategoryPicker'

export interface LogPastWorkRowProps {
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onAddPeriod: (start: string, end: string, category: string) => void
}

export function LogPastWorkRow({
  categories,
  defaultCategory,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onAddPeriod,
}: LogPastWorkRowProps) {
  const [category, setCategory] = useState(defaultCategory)
  const [seenDefault, setSeenDefault] = useState(defaultCategory)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  if (defaultCategory !== seenDefault) {
    setSeenDefault(defaultCategory)
    setCategory(defaultCategory)
  }

  const canAdd = Boolean(newStart && newEnd)
  const addPeriod = () => {
    if (!canAdd) return
    onAddPeriod(newStart, newEnd, category)
    setNewStart('')
    setNewEnd('')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm dark:border-gray-700">
      <span className="text-gray-500 dark:text-gray-400">Log work</span>
      <input
        type="time"
        aria-label="New work period start"
        value={newStart}
        onChange={(e) => setNewStart(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addPeriod()}
        className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <span className="text-gray-400">–</span>
      <input
        type="time"
        aria-label="New work period end"
        value={newEnd}
        onChange={(e) => setNewEnd(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addPeriod()}
        className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={setCategory}
        compact
        ariaLabel="Category for the new work period"
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      <button
        type="button"
        disabled={!canAdd}
        onClick={addPeriod}
        className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        Add work period
      </button>
    </div>
  )
}
