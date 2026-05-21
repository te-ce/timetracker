import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository } from '../repositories/types'
import { getAllCategories } from '../domain/categories'

interface Props {
  repository: ConfigRepository
}

export function AutoCategorySettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (category: string | null) =>
      repository.save({ ...config!, autoCategory: category }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

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
        className="w-64 rounded border px-3 py-2 text-sm"
      >
        <option value="">None (disabled)</option>
        {allCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">
        Remaining hours after manual entries auto-fill this category.
      </p>
    </div>
  )
}
