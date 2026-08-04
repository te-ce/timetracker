import { useRef, useEffect } from 'react'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'

interface CategoryPickerProps {
  value: string
  categories: string[]
  onChange: (cat: string) => void
  compact?: boolean
  focusOnMount?: boolean
  categoryDescriptions?: Record<string, string> | undefined
  ariaLabel?: string
}

export function CategoryPicker({
  value,
  categories,
  onChange,
  compact,
  focusOnMount,
  categoryDescriptions,
  ariaLabel = 'Category',
}: CategoryPickerProps) {
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (focusOnMount) selectRef.current?.focus()
  }, [focusOnMount])

  const selectClass = compact
    ? 'text-sm rounded border bg-transparent pl-2 pr-6 py-1 dark:border-gray-600 dark:text-gray-100 max-w-[10rem]'
    : 'text-sm rounded border bg-transparent pl-2 pr-6 py-1.5 dark:border-gray-600 dark:text-gray-100 min-w-[8rem] max-w-[14rem]'

  return (
    <select
      ref={selectRef}
      aria-label={ariaLabel}
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
