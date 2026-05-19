import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository } from '../repositories/types'
import { CATEGORIES } from '../repositories/types'

interface Props {
  repository: ConfigRepository
}

export function CustomCategorySettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const [newCategory, setNewCategory] = useState('')

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => repository.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (categories: string[]) =>
      repository.save({ ...config!, customCategories: categories }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  if (!config) return null

  const allExisting = new Set([...CATEGORIES, ...config.customCategories])

  function handleAdd() {
    const trimmed = newCategory.trim()
    if (!trimmed || allExisting.has(trimmed)) return
    saveMutation.mutate([...config!.customCategories, trimmed])
    setNewCategory('')
  }

  function handleRemove(category: string) {
    saveMutation.mutate(config!.customCategories.filter((c) => c !== category))
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Custom Categories</span>

      {config.customCategories.length > 0 && (
        <ul className="flex flex-col gap-1">
          {config.customCategories.map((cat) => (
            <li key={cat} className="flex items-center justify-between rounded border bg-white px-3 py-1.5 text-sm">
              <span>{cat}</span>
              <button
                aria-label={`Remove ${cat}`}
                onClick={() => handleRemove(cat)}
                className="text-red-500 hover:text-red-700 text-xs font-medium"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          aria-label="New category"
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Category name"
          className="flex-1 rounded border px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleAdd}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Add investment or project categories. These become bookable in TimeEntries and MonthGrid.
      </p>
    </div>
  )
}
