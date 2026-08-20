import { useState } from 'react'
import { CategoryPicker } from './CategoryPicker'
import { TimeNowField } from './TimeNowField'

export interface NotTrackingRowProps {
  now: string
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onStart: (category: string, startTime: string) => void
}

export function NotTrackingRow({
  now,
  categories,
  defaultCategory,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onStart,
}: NotTrackingRowProps) {
  const [category, setCategory] = useState(defaultCategory)
  const [seenDefault, setSeenDefault] = useState(defaultCategory)
  const [customStart, setCustomStart] = useState<string | null>(null)

  if (defaultCategory !== seenDefault) {
    setSeenDefault(defaultCategory)
    setCategory(defaultCategory)
  }

  const start = () => {
    onStart(category, customStart ?? now)
    setCustomStart(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm dark:border-gray-700">
      <span className="text-gray-500 dark:text-gray-400">Not tracking</span>
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={setCategory}
        compact
        ariaLabel="Category to start"
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      <span className="ml-auto flex items-center gap-2">
        <TimeNowField
          now={now}
          value={customStart}
          onChange={setCustomStart}
          ariaLabel="Start time"
          onConfirm={start}
        />
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          ▶ Start tracking
        </button>
      </span>
    </div>
  )
}
