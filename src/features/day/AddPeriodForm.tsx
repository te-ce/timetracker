import { useRef, useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { NowChip } from './NowChip'
import { nowHHMM } from '../../shared/worktime'
import { CategoryPicker } from './CategoryPicker'

interface AddPeriodFormProps {
  openPeriod: WorkPeriod | null
  defaultCategory: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  onAdd: (w: WorkPeriod) => void
}

export function AddPeriodForm({
  openPeriod,
  defaultCategory,
  categories,
  categoryDescriptions,
  onAdd,
}: AddPeriodFormProps) {
  const draftStartRef = useRef('')
  const [draftEnd, setDraftEnd] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [prevDefaultCategory, setPrevDefaultCategory] = useState(defaultCategory)
  const [startResetKey, setStartResetKey] = useState(0)

  if (prevDefaultCategory !== defaultCategory) {
    setPrevDefaultCategory(defaultCategory)
    setCategory(defaultCategory)
  }

  const isLive = !draftEnd
  const canSubmit = !isLive || !openPeriod

  function handleAdd() {
    if (!canSubmit) return
    const start = draftStartRef.current || nowHHMM()
    onAdd({ id: crypto.randomUUID(), start, end: draftEnd || null, category, subtasks: [] })
    draftStartRef.current = ''
    setStartResetKey((k) => k + 1)
    setDraftEnd('')
    setCategory(defaultCategory)
  }

  return (
    <div className="border-t dark:border-gray-700 pt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <NowChip
          key={startResetKey}
          aria-label="Start"
          onChange={(v) => {
            draftStartRef.current = v
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
        />
        <span className="text-gray-400 text-sm">–</span>
        <input
          type="time"
          value={draftEnd}
          onChange={(e) => setDraftEnd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          aria-label="End"
          className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
        />
        <CategoryPicker
          value={category}
          categories={categories}
          categoryDescriptions={categoryDescriptions}
          onChange={setCategory}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canSubmit}
          className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-40 whitespace-nowrap"
        >
          {isLive ? 'Start tracking' : 'Add period'}
        </button>
      </div>
    </div>
  )
}
