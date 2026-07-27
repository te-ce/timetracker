import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { getAllCategories } from '../../shared/categories'
import { useDragReorder } from '../../shared/reorder'

interface Props {
  repository: ConfigRepository
}

export function CategoryReorderPopover({ repository }: Props) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (categoryOrder: string[]) => repository.save({ ...config!, categoryOrder }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && e.target instanceof Node && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const categories = config ? getAllCategories(config.customCategories, config.categoryOrder) : []
  const { dragOverIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    categories,
    (newOrder) => saveMutation.mutate(newOrder),
  )

  if (!config) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        data-tooltip="Reorder categories"
        aria-label="Reorder categories"
      >
        ⠿ Categories
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Drag to reorder</p>
          <div role="listbox" aria-label="Categories" className="flex flex-col gap-1">
            {categories.map((cat, idx) => (
              <div
                key={cat}
                role="option"
                aria-selected={false}
                tabIndex={0}
                draggable
                onDragStart={(e) => {
                  const el = e.currentTarget
                  const rect = el.getBoundingClientRect()
                  const dt: unknown = e.dataTransfer
                  if (dt instanceof DataTransfer) {
                    dt.setDragImage(el, e.clientX - rect.left, e.clientY - rect.top)
                  }
                  handleDragStart(idx)
                }}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    handleDragStart(idx)
                    handleDrop(idx - 1)
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    handleDragStart(idx)
                    handleDrop(idx + 1)
                  }
                }}
                className={`flex items-center gap-2 rounded border px-2 py-1 text-xs cursor-grab active:cursor-grabbing select-none ${dragOverIdx === idx ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/40' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}`}
              >
                <span className="text-gray-300 dark:text-gray-600" aria-hidden>
                  ⠿
                </span>
                <span className="flex-1 truncate">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
