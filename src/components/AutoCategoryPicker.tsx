import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import { useRepositories } from '../repositories/RepositoryContext'
import { getAllCategories } from '../domain/categories'

export function AutoCategoryPicker() {
  const { configRepo } = useRepositories()
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const mutation = useMutation({
    mutationFn: (category: string | null) => configRepo.save({ ...config!, autoCategory: category }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  if (!config) return null

  const allCategories = getAllCategories(config.customCategories, config.categoryOrder)

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="auto-cat-inline" className="text-gray-500 dark:text-gray-400 text-xs font-medium">
        Auto:
      </label>
      <select
        id="auto-cat-inline"
        aria-label="Auto category"
        value={config.autoCategory ?? ''}
        onChange={(e) => {
          const val = e.target.value
          mutation.mutate(val === '' ? null : val)
        }}
        className="rounded border px-2 py-1 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
      >
        <option value="">None</option>
        {allCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}
