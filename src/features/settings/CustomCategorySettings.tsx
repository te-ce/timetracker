import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { getAllCategories } from '../../shared/categories'

interface Props {
  repository: ConfigRepository
}

export function CustomCategorySettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const [newCategory, setNewCategory] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (updates: { customCategories?: string[]; categoryOrder?: string[] }) =>
      repository.save({ ...config!, ...updates }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const { customCategories } = config
  const categories = getAllCategories(customCategories, config.categoryOrder)

  function handleAdd() {
    const trimmed = newCategory.trim()
    if (!trimmed || categories.includes(trimmed)) return
    const newCustom = [...customCategories, trimmed]
    const newOrder = [...categories, trimmed]
    saveMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
    setNewCategory('')
  }

  function handleRemove(idx: number) {
    const cat = categories[idx]
    const newOrder = categories.filter((_, i) => i !== idx)
    const newCustom = customCategories.filter((c) => c !== cat)
    saveMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
  }

  function handleRename(idx: number) {
    const trimmed = editValue.trim()
    const oldName = categories[idx]
    if (!trimmed || !oldName || trimmed === oldName || categories.includes(trimmed)) {
      setEditingIdx(null)
      return
    }
    const newOrder = categories.map((c, i) => (i === idx ? trimmed : c))
    const newCustom = customCategories.map((c) => (c === oldName ? trimmed : c))
    const wasCustom = customCategories.includes(oldName)
    if (!wasCustom) {
      newCustom.push(trimmed)
    }
    saveMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
    setEditingIdx(null)
  }

  function handleDragStart(idx: number) {
    dragIdx.current = idx
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDrop(idx: number) {
    const from = dragIdx.current
    if (from === null || from === idx) {
      dragIdx.current = null
      setDragOverIdx(null)
      return
    }
    const newOrder = [...categories]
    const spliced = newOrder.splice(from, 1)
    const moved = spliced[0]
    if (moved === undefined) return
    newOrder.splice(idx, 0, moved)
    saveMutation.mutate({ categoryOrder: newOrder })
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Categories</span>

      <ul className="flex flex-col gap-1">
        {categories.map((cat, idx) => (
          <li
            key={cat}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-1.5 text-sm cursor-grab active:cursor-grabbing ${dragOverIdx === idx ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
          >
            <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>
              ⠿
            </span>
            {editingIdx === idx ? (
              <input
                aria-label={`Rename ${cat}`}
                ref={(el) => {
                  el?.focus()
                }}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleRename(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(idx)
                  if (e.key === 'Escape') setEditingIdx(null)
                }}
                className="flex-1 rounded border px-2 py-0.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            ) : (
              <span
                className="flex-1 cursor-pointer"
                onDoubleClick={() => {
                  setEditingIdx(idx)
                  setEditValue(cat)
                }}
                data-tooltip="Double-click to rename"
              >
                {cat}
              </span>
            )}
            <button
              aria-label={`Remove ${cat}`}
              onClick={() => handleRemove(idx)}
              className="text-red-500 hover:text-red-700 text-xs font-medium"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          aria-label="New category"
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Category name"
          className="flex-1 rounded border px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
        />
        <button
          onClick={handleAdd}
          className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
        >
          Add
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Drag to reorder. Double-click to rename. Changes apply across all views.
      </p>
    </div>
  )
}
