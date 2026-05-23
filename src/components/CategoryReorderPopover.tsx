import { useRef, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository } from '../repositories/types'
import { getAllCategories } from '../domain/categories'

interface Props {
  repository: ConfigRepository
}

export function CategoryReorderPopover({ repository }: Props) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const saveMutation = useMutation({
    mutationFn: (categoryOrder: string[]) => repository.save({ ...config!, categoryOrder }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
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

  if (!config) return null

  const categories = getAllCategories(config.customCategories, config.categoryOrder)

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
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(idx, 0, moved)
    saveMutation.mutate(newOrder)
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
        title="Reorder categories"
        aria-label="Reorder categories"
      >
        ⠿ Categories
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-gray-500">Drag to reorder</p>
          <ul className="flex flex-col gap-1">
            {categories.map((cat, idx) => (
              <li
                key={cat}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 rounded border px-2 py-1 text-xs cursor-grab active:cursor-grabbing select-none ${dragOverIdx === idx ? 'border-indigo-400 bg-indigo-50' : 'bg-white'}`}
              >
                <span className="text-gray-300" aria-hidden>
                  ⠿
                </span>
                <span className="flex-1 truncate">{cat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
