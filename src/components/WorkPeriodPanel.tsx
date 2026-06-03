import { useState } from 'react'
import type { WorkPeriod, WorkPeriodSlice, MonthRepository } from '../repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'
import { calculateWorkedHours } from '../domain/worktime'
import { getAllCategories } from '../domain/categories'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[]
  categoryOrder?: string[]
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function periodDuration(w: WorkPeriod): number {
  return calculateWorkedHours([w])
}

function formatHours(h: number): string {
  return h.toFixed(2) + 'h'
}

function parseDurationInput(raw: string): number | null {
  const trimmed = raw.trim()
  const hhmmMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1] ?? '0')
    const m = parseInt(hhmmMatch[2] ?? '0')
    return h + m / 60
  }
  const num = parseFloat(trimmed)
  if (!isNaN(num) && num > 0) return num
  return null
}

// ─── Category Picker ──────────────────────────────────────────────────────────

interface CategoryPickerProps {
  value: string
  categories: string[]
  onChange: (cat: string) => void
  compact?: boolean
}

function CategoryPicker({ value, categories, onChange, compact }: CategoryPickerProps) {
  const selectClass = compact
    ? 'text-xs rounded border px-1 py-0.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-[10rem]'
    : 'text-sm rounded-lg border px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1'

  return (
    <select aria-label="Category" value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value={UNCATEGORIZED_CATEGORY}>Uncategorized</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

// ─── Slice Row (display + inline edit) ────────────────────────────────────────

interface SliceRowProps {
  sl: WorkPeriodSlice
  periodId: string
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
}

function SliceRow({ sl, periodId, date, categories, mutations }: SliceRowProps) {
  const [editing, setEditing] = useState(false)
  const [editCategory, setEditCategory] = useState(sl.category)
  const [editHours, setEditHours] = useState(String(sl.hours))

  function commitEdit() {
    const hours = parseDurationInput(editHours)
    if (!hours || hours <= 0) {
      setEditing(false)
      return
    }
    mutations.addSlice.mutate({ date, periodId, slice: { ...sl, category: editCategory, hours } })
    setEditing(false)
  }

  function beginEdit() {
    setEditCategory(sl.category)
    setEditHours(String(sl.hours))
    setEditing(true)
  }

  if (editing) {
    return (
      <div
        className="flex items-center gap-2 text-sm py-0.5"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) commitEdit()
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
        <CategoryPicker value={editCategory} categories={categories} onChange={setEditCategory} compact />
        <input
          type="text"
          value={editHours}
          onChange={(e) => setEditHours(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          aria-label="Slice hours"
          className="text-xs rounded border px-2 py-0.5 w-20 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={commitEdit}
          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm group/slice">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
      <button
        onClick={beginEdit}
        className="font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
        aria-label={`Edit ${sl.category} slice`}
      >
        {sl.category}
      </button>
      <button
        onClick={beginEdit}
        className="text-gray-400 dark:text-gray-500 text-xs hover:text-indigo-600 dark:hover:text-indigo-400"
        aria-label={`Edit ${sl.category} hours`}
      >
        {formatHours(sl.hours)}
      </button>
      <button
        onClick={() => mutations.deleteSlice.mutate({ date, periodId, sliceId: sl.id })}
        className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-base leading-none opacity-0 group-hover/slice:opacity-100 transition-opacity"
        aria-label={`Remove ${sl.category} slice`}
      >
        ×
      </button>
    </div>
  )
}

// ─── Add Slice Form ───────────────────────────────────────────────────────────

interface SliceFormProps {
  categories: string[]
  onAdd: (slice: WorkPeriodSlice) => void
  onCancel: () => void
}

function SliceForm({ categories, onAdd, onCancel }: SliceFormProps) {
  const [category, setCategory] = useState(categories[0] ?? UNCATEGORIZED_CATEGORY)
  const [durationRaw, setDurationRaw] = useState('')

  function handleSubmit() {
    const hours = parseDurationInput(durationRaw)
    if (!hours || hours <= 0) return
    onAdd({ id: crypto.randomUUID(), category, hours })
    setDurationRaw('')
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CategoryPicker value={category} categories={categories} onChange={setCategory} compact />
      <input
        type="text"
        placeholder="1.5 or 1:30"
        value={durationRaw}
        onChange={(e) => setDurationRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        aria-label="Slice duration"
        ref={(el) => el?.focus()}
        className="text-xs rounded border px-2 py-0.5 w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <button
        onClick={handleSubmit}
        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        Add
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Add Period Form ──────────────────────────────────────────────────────────

interface AddPeriodFormProps {
  windows: WorkPeriod[]
  defaultCategory: string
  categories: string[]
  onAdd: (w: WorkPeriod) => void
}

function AddPeriodForm({ windows, defaultCategory, categories, onAdd }: AddPeriodFormProps) {
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [category, setCategory] = useState(defaultCategory)

  const openPeriod = windows.find((w) => w.end === null) ?? null
  const effectiveStart = openPeriod?.start ?? draftStart
  const startId = 'apf-start'
  const endId = 'apf-end'

  function handleAdd() {
    if (!effectiveStart) return
    onAdd({ id: crypto.randomUUID(), start: effectiveStart, end: draftEnd || null, category, slices: [] })
    setDraftStart('')
    setDraftEnd('')
  }

  return (
    <div className="border-t dark:border-gray-700 pt-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor={startId} className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 shrink-0">
          Start
        </label>
        <input
          id={startId}
          type="time"
          value={effectiveStart}
          disabled={!!openPeriod}
          onChange={(e) => setDraftStart(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {!openPeriod && (
          <button
            type="button"
            onClick={() => setDraftStart(nowHHMM())}
            className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
          >
            Now
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor={endId} className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 shrink-0">
          End
        </label>
        <input
          id={endId}
          type="time"
          value={draftEnd}
          onChange={(e) => setDraftEnd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => setDraftEnd(nowHHMM())}
          className="rounded-lg border px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
        >
          Now
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 shrink-0">Cat.</span>
        <CategoryPicker value={category} categories={categories} onChange={setCategory} />
      </div>
      <button
        onClick={handleAdd}
        disabled={!effectiveStart}
        className="w-full rounded-lg bg-indigo-600 dark:bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-40"
      >
        Add period
      </button>
    </div>
  )
}

// ─── Period Card ──────────────────────────────────────────────────────────────

interface PeriodCardProps {
  w: WorkPeriod
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
}

interface CardHeaderProps {
  w: WorkPeriod
  date: string
  duration: number
  slicedHours: number
  overbooked: boolean
  uncategorized: boolean
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
}

function CardHeader({
  w,
  date,
  duration,
  slicedHours,
  overbooked,
  uncategorized,
  categories,
  mutations,
}: CardHeaderProps) {
  const [editingTime, setEditingTime] = useState(false)
  const [editStart, setEditStart] = useState(w.start)
  const [editEnd, setEditEnd] = useState(w.end ?? '')

  function saveTime() {
    mutations.saveWithAbsorbed.mutate({ date, window: { ...w, start: editStart, end: editEnd || null }, absorbed: [] })
    setEditingTime(false)
  }

  const headerBg = overbooked
    ? 'bg-red-50 dark:bg-red-900/20'
    : uncategorized
      ? 'bg-amber-50 dark:bg-amber-900/20'
      : 'bg-gray-50 dark:bg-gray-800/60'

  return (
    <div className={`flex items-center justify-between px-4 py-3 ${headerBg}`}>
      <div className="flex items-center gap-3 min-w-0">
        {editingTime ? (
          <div
            className="flex items-center gap-1"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) saveTime()
            }}
          >
            <input
              type="time"
              value={editStart}
              onChange={(e) => setEditStart(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTime()
                if (e.key === 'Escape') setEditingTime(false)
              }}
              aria-label="Edit start time"
              className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="time"
              value={editEnd}
              onChange={(e) => setEditEnd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTime()
                if (e.key === 'Escape') setEditingTime(false)
              }}
              aria-label="Edit end time"
              className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <button onClick={saveTime} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium ml-1">
              Save
            </button>
            <button onClick={() => setEditingTime(false)} className="text-xs text-gray-400 ml-1">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditStart(w.start)
              setEditEnd(w.end ?? '')
              setEditingTime(true)
            }}
            className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
            aria-label={`Edit period ${w.start} to ${w.end ?? 'open end'}`}
          >
            {w.start} – {w.end ?? '…'}
          </button>
        )}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-full px-2 py-0.5 border dark:border-gray-600 shrink-0">
          {formatHours(duration)}
        </span>
        {overbooked && (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-full px-2 py-0.5 shrink-0">
            +{formatHours(slicedHours - duration)} over
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <CategoryPicker
          value={w.category}
          categories={categories}
          onChange={(cat) => mutations.setPeriodCategory.mutate({ date, periodId: w.id, category: cat })}
          compact
        />
        <button
          onClick={() => mutations.remove.mutate({ date, id: w.id })}
          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-lg leading-none"
          aria-label="Remove period"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function PeriodCard({ w, date, categories, mutations }: PeriodCardProps) {
  const [addingSlice, setAddingSlice] = useState(false)

  const duration = periodDuration(w)
  const slicedHours = w.slices.reduce((s, sl) => s + sl.hours, 0)
  const remainder = Math.max(0, duration - slicedHours)
  const overbooked = slicedHours > duration + 0.001
  const uncategorized = w.category === UNCATEGORIZED_CATEGORY && remainder > 0.001

  return (
    <div className="rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
      <CardHeader
        w={w}
        date={date}
        duration={duration}
        slicedHours={slicedHours}
        overbooked={overbooked}
        uncategorized={uncategorized}
        categories={categories}
        mutations={mutations}
      />

      <div className="px-4 py-3 flex flex-col gap-1.5">
        {w.slices.map((sl) => (
          <SliceRow key={sl.id} sl={sl} periodId={w.id} date={date} categories={categories} mutations={mutations} />
        ))}

        {remainder > 0.001 && (
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${uncategorized ? 'bg-amber-400' : 'bg-emerald-400 dark:bg-emerald-500'}`}
            />
            <span
              className={`font-medium ${uncategorized ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {uncategorized ? 'Uncategorized' : w.category}
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-xs">{formatHours(remainder)}</span>
            <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600 uppercase tracking-wide">base</span>
          </div>
        )}

        {overbooked && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Slices exceed period by {formatHours(slicedHours - duration)} — reduce slice hours or extend the period.
          </p>
        )}

        {addingSlice ? (
          <SliceForm
            categories={categories}
            onAdd={(sl) => {
              mutations.addSlice.mutate({ date, periodId: w.id, slice: sl })
              setAddingSlice(false)
            }}
            onCancel={() => setAddingSlice(false)}
          />
        ) : (
          <button
            onClick={() => setAddingSlice(true)}
            className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 self-start mt-0.5"
          >
            + split this period
          </button>
        )}
      </div>
    </div>
  )
}

// ─── WorkPeriodPanel ──────────────────────────────────────────────────────────

export function WorkPeriodPanel({
  date,
  windows,
  repository,
  autoCategory,
  customCategories = [],
  categoryOrder,
}: Props) {
  const mutations = useWorkPeriodMutations(repository)
  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const openPeriod = windows.find((w) => w.end === null) ?? null
  const categories = getAllCategories(customCategories, categoryOrder)
  const defaultCategory = autoCategory ?? UNCATEGORIZED_CATEGORY

  function handleAdd(incoming: WorkPeriod) {
    const windowsForMerge = openPeriod ? windows.filter((w) => w.id !== openPeriod.id) : windows
    const { merged, absorbed } = mergeAdjacentInto(windowsForMerge, incoming)
    const allAbsorbed = openPeriod ? [...absorbed, openPeriod.id] : absorbed
    mutations.saveWithAbsorbed.mutate({ date, window: merged, absorbed: allAbsorbed })
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No periods recorded yet</p>
      ) : (
        sorted.map((w) => <PeriodCard key={w.id} w={w} date={date} categories={categories} mutations={mutations} />)
      )}
      <AddPeriodForm windows={windows} defaultCategory={defaultCategory} categories={categories} onAdd={handleAdd} />
    </div>
  )
}
