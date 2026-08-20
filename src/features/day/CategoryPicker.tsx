import { categoryDisplay } from './categoryLabel'

interface CategoryPickerProps {
  value: string
  categories: string[]
  onChange: (cat: string) => void
  compact?: boolean
  focusOnMount?: boolean
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  ariaLabel?: string
}

export function CategoryPicker({
  value,
  categories,
  onChange,
  compact,
  focusOnMount,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary = false,
  ariaLabel = 'Category',
}: CategoryPickerProps) {
  const selectClass = compact
    ? 'h-7 text-sm rounded border bg-transparent pl-2 pr-6 dark:border-gray-600 dark:text-gray-100 max-w-[10rem]'
    : 'text-sm rounded border bg-transparent pl-2 pr-6 py-1.5 dark:border-gray-600 dark:text-gray-100 min-w-[8rem] max-w-[14rem]'

  return (
    <select
      // The picker mounts already focused when it is opened as an editor.
      autoFocus={focusOnMount}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      {categories.map((c) => {
        const { primary, secondary } = categoryDisplay(
          c,
          categoryDescriptions ?? {},
          preferCategoryDescriptionAsPrimary,
        )
        return (
          <option key={c} value={c}>
            {secondary ? `${primary} (${secondary})` : primary}
          </option>
        )
      })}
    </select>
  )
}
