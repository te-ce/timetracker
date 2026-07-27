import { useRef, useState } from 'react'

export function reorderArray<T>(items: T[], from: number, to: number): T[] {
  const clampedTo = Math.max(0, Math.min(to, items.length - 1))
  if (from === clampedTo) return items
  const next = [...items]
  const spliced = next.splice(from, 1)
  const moved = spliced[0]
  if (moved === undefined) return items
  next.splice(clampedTo, 0, moved)
  return next
}

export interface DragReorderHandlers {
  dragOverIdx: number | null
  handleDragStart: (idx: number) => void
  handleDragOver: (e: { preventDefault: () => void }, idx: number) => void
  handleDrop: (idx: number) => void
  handleDragEnd: () => void
}

export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void): DragReorderHandlers {
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  function handleDragStart(idx: number) {
    dragIdx.current = idx
  }

  function handleDragOver(e: { preventDefault: () => void }, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDrop(idx: number) {
    const from = dragIdx.current
    dragIdx.current = null
    setDragOverIdx(null)
    if (from === null || from === idx) return
    onReorder(reorderArray(items, from, idx))
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  return { dragOverIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}
