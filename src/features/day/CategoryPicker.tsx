import { useRef, useEffect } from 'react'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'

interface CategoryPickerProps {
  value: string
  categories: string[]
  onChange: (cat: string) => void
  compact?: boolean
  focusOnMount?: boolean
  categoryDescriptions?: Record<string, string> | undefined
}

export function CategoryPicker({
  value,
  categories,
  onChange,
  compact,
  focusOnMount,
  categoryDescriptions,
}: CategoryPickerProps) {
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (focusOnMount) selectRef.current?.focus()
  }, [focusOnMount])

  const selectClass = compact
    ? 'text-sm rounded border px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-[10rem]'
    : 'text-sm rounded-lg border px-2 py-1.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[8rem] max-w-[14rem]'

  return (
    <select
      ref={selectRef}
      aria-label="Category"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      <option value={UNCATEGORIZED_CATEGORY}>Uncategorized</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {categoryDescriptions?.[c] ? `${c} (${categoryDescriptions[c]})` : c}
        </option>
      ))}
    </select>
  )
}
