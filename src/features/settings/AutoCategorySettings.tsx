import type { ConfigRepository } from '../../infra/repositories/types'
import { getAllCategories } from '../../shared/categories'
import { useConfigFieldMutation } from './useConfigFieldMutation'

interface Props {
  repository: ConfigRepository
}

export function AutoCategorySettings({ repository }: Props) {
  const { config, mutation } = useConfigFieldMutation<string | null>(repository, (config, category) => ({
    ...config,
    autoCategory: category,
  }))

  if (!config) return null

  const allCategories = getAllCategories(config.customCategories, config.categoryOrder)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="auto-category-select" className="text-sm font-medium">
        Auto Category
      </label>
      <select
        id="auto-category-select"
        aria-label="Auto category"
        value={config.autoCategory ?? ''}
        onChange={(e) => {
          const val = e.target.value
          mutation.mutate(val === '' ? null : val)
        }}
        className="w-64 rounded border bg-transparent pl-3 pr-6 py-2 text-sm dark:border-gray-600 dark:text-gray-100"
      >
        <option value="">None (disabled)</option>
        {allCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Remaining hours after manual entries auto-fill this category.
      </p>
    </div>
  )
}
