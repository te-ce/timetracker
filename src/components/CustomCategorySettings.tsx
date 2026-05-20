import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository } from '../repositories/types'
import { getAllCategories } from '../domain/categories'

interface Props {
  repository: ConfigRepository
}

export function CustomCategorySettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const [newCategory, setNewCategory] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => repository.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (updates: { customCategories?: string[]; categoryOrder?: string[] }) =>
      repository.save({ ...config!, ...updates }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  if (!config) return null

  const categories = getAllCategories(config.customCategories ?? [], config.categoryOrder)

  function handleAdd() {
    const trimmed = newCategory.trim()
    if (!trimmed || categories.includes(trimmed)) return
    const newCustom = [...(config!.customCategories ?? []), trimmed]
    const newOrder = [...categories, trimmed]
    saveMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
    setNewCategory('')
  }

  function handleRemove(idx: number) {
    const cat = categories[idx]
    const newOrder = categories.filter((_, i) => i !== idx)
    const newCustom = (config!.customCategories ?? []).filter((c) => c !== cat)
    saveMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
  }

  function handleRename(idx: number) {
    const trimmed = editValue.trim()
    const oldName = categories[idx]
    if (!trimmed || trimmed === oldName || categories.includes(trimmed)) {
      setEditingIdx(null)
      return
    }
    const newOrder = categories.map((c, i) => (i === idx ? trimmed : c))
    const newCustom = (config!.customCategories ?? []).map((c) => (c === oldName ? trimmed : c))
    // If renaming a default, add the new name as custom and keep order
    const wasCustom = (config!.customCategories ?? []).includes(oldName)
    if (!wasCustom) {
      newCustom.push(trimmed)
    }
    saveMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
    setEditingIdx(null)
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return
    const newOrder = [...categories]
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    saveMutation.mutate({ categoryOrder: newOrder })
  }

  function handleMoveDown(idx: number) {
    if (idx === categories.length - 1) return
    const newOrder = [...categories]
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    saveMutation.mutate({ categoryOrder: newOrder })
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Categories</span>

      <ul className="flex flex-col gap-1">
        {categories.map((cat, idx) => (
          <li key={cat} className="flex items-center gap-2 rounded border bg-white px-3 py-1.5 text-sm">
            <div className="flex flex-col">
              <button
                aria-label={`Move ${cat} up`}
                onClick={() => handleMoveUp(idx)}
                disabled={idx === 0}
                className="text-xs leading-none text-gray-400 hover:text-gray-700 disabled:opacity-30"
              >▲</button>
              <button
                aria-label={`Move ${cat} down`}
                onClick={() => handleMoveDown(idx)}
                disabled={idx === categories.length - 1}
                className="text-xs leading-none text-gray-400 hover:text-gray-700 disabled:opacity-30"
              >▼</button>
            </div>
            {editingIdx === idx ? (
              <input
                aria-label={`Rename ${cat}`}
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleRename(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(idx)
                  if (e.key === 'Escape') setEditingIdx(null)
                }}
                className="flex-1 rounded border px-2 py-0.5 text-sm"
              />
            ) : (
              <span
                className="flex-1 cursor-pointer"
                onDoubleClick={() => { setEditingIdx(idx); setEditValue(cat) }}
                title="Double-click to rename"
              >{cat}</span>
            )}
            <button
              aria-label={`Remove ${cat}`}
              onClick={() => handleRemove(idx)}
              className="text-red-500 hover:text-red-700 text-xs font-medium"
            >✕</button>
          </li>
        ))}
      </ul>

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
        Drag or use arrows to reorder. Double-click to rename. Changes apply across all views.
      </p>
    </div>
  )
}
