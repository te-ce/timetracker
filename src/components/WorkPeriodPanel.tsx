import { useState } from 'react'
import type { WorkPeriod, WorkPeriodSlice, MonthRepository } from '../repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { useWorkPeriodMutations } from '../hooks/useWorkPeriodMutations'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateCategoryHours } from '../domain/periodCategories'
import { getAllCategories } from '../domain/categories'

export type PanelVariant = 'A' | 'B' | 'C'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[]
  categoryOrder?: string[]
  variant: PanelVariant
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
  // HH:MM format
  const hhmmMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1] ?? '0')
    const m = parseInt(hhmmMatch[2] ?? '0')
    return h + m / 60
  }
  // decimal or integer hours like "1.5" or "0.5"
  const num = parseFloat(trimmed)
  if (!isNaN(num) && num > 0) return num
  return null
}

// ─── Category Picker ───────────────────────────────────────────────────────

interface CategoryPickerProps {
  value: string
  categories: string[]
  onChange: (cat: string) => void
  compact?: boolean
}

function CategoryPicker({ value, categories, onChange, compact }: CategoryPickerProps) {
  const isUncategorized = value === UNCATEGORIZED_CATEGORY
  const label = isUncategorized ? '— uncat —' : value
  const selectClass = compact
    ? 'text-xs rounded border px-1 py-0.5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-[9rem]'
    : 'text-sm rounded-lg border px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1'

  return (
    <select aria-label="Category" value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value={UNCATEGORIZED_CATEGORY}>{label}</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  )
}

// ─── Slice Form ─────────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <CategoryPicker value={category} categories={categories} onChange={setCategory} compact />
      <input
        type="text"
        placeholder="e.g. 1.5 or 1:30"
        value={durationRaw}
        onChange={(e) => setDurationRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        aria-label="Slice duration"
        className="text-xs rounded border px-2 py-0.5 w-28 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
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

// ─── Add Period Form ─────────────────────────────────────────────────────────

interface AddPeriodFormProps {
  date: string
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

// ─── Variant A: Compact List ─────────────────────────────────────────────────

interface VariantAProps {
  date: string
  windows: WorkPeriod[]
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
}

interface PeriodRowAProps {
  w: WorkPeriod
  next: WorkPeriod | null
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  isExpanded: boolean
  addingSlice: boolean
  editingId: string | null
  editStart: string
  editEnd: string
  onToggleExpand: () => void
  onAddSliceOpen: () => void
  onAddSliceClose: () => void
  onEditBegin: () => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditStartChange: (v: string) => void
  onEditEndChange: (v: string) => void
}

function PeriodRowAView({
  w,
  date,
  categories,
  mutations,
  duration,
  isExpanded,
  editingId,
  editStart,
  editEnd,
  onToggleExpand,
  onEditBegin,
  onEditSave,
  onEditCancel,
  onEditStartChange,
  onEditEndChange,
}: Omit<PeriodRowAProps, 'next' | 'addingSlice' | 'onAddSliceOpen' | 'onAddSliceClose'> & { duration: number }) {
  if (editingId === w.id) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <input
          type="time"
          value={editStart}
          onChange={(e) => onEditStartChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSave()
            if (e.key === 'Escape') onEditCancel()
          }}
          className="rounded border px-1.5 py-0.5 text-sm w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <span className="text-gray-400">–</span>
        <input
          type="time"
          value={editEnd}
          onChange={(e) => onEditEndChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEditSave()
            if (e.key === 'Escape') onEditCancel()
          }}
          className="rounded border px-1.5 py-0.5 text-sm w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <button onClick={onEditSave} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
          Save
        </button>
        <button onClick={onEditCancel} className="text-xs text-gray-400">
          Cancel
        </button>
      </div>
    )
  }
  const sliceCount = w.slices.length
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm">
      <button
        onClick={onEditBegin}
        className="font-mono font-medium hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
      >
        {w.start} – {w.end ?? '…'}
      </button>
      <CategoryPicker
        value={w.category}
        categories={categories}
        onChange={(cat) => mutations.setPeriodCategory.mutate({ date, periodId: w.id, category: cat })}
        compact
      />
      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatHours(duration)}</span>
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <button
          onClick={onToggleExpand}
          className={`text-xs rounded border px-1.5 py-0.5 ${isExpanded ? 'text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700' : 'text-gray-400 dark:text-gray-500 dark:border-gray-600'} hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400`}
          aria-label={isExpanded ? 'Collapse slices' : 'Expand slices'}
        >
          {sliceCount > 0 ? `${sliceCount} slice${sliceCount > 1 ? 's' : ''}` : '+ split'}
        </button>
        <button
          onClick={() => mutations.remove.mutate({ date, id: w.id })}
          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-base leading-none"
          aria-label="Remove"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function PeriodRowA({
  w,
  next,
  date,
  categories,
  mutations,
  isExpanded,
  addingSlice,
  editingId,
  editStart,
  editEnd,
  onToggleExpand,
  onAddSliceOpen,
  onAddSliceClose,
  onEditBegin,
  onEditSave,
  onEditCancel,
  onEditStartChange,
  onEditEndChange,
}: PeriodRowAProps) {
  const duration = periodDuration(w)
  const slicedHours = w.slices.reduce((s, sl) => s + sl.hours, 0)
  const remainder = Math.max(0, duration - slicedHours)
  const canMerge = next !== null && w.end !== null

  return (
    <li className="rounded-lg border dark:border-gray-700 overflow-hidden">
      <PeriodRowAView
        w={w}
        date={date}
        categories={categories}
        mutations={mutations}
        duration={duration}
        isExpanded={isExpanded}
        editingId={editingId}
        editStart={editStart}
        editEnd={editEnd}
        onToggleExpand={onToggleExpand}
        onEditBegin={onEditBegin}
        onEditSave={onEditSave}
        onEditCancel={onEditCancel}
        onEditStartChange={onEditStartChange}
        onEditEndChange={onEditEndChange}
      />

      {/* Slices (expanded) */}
      {isExpanded && (
        <div className="border-t dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
          {w.slices.length > 0 && (
            <ul className="flex flex-col gap-1 mb-2">
              {w.slices.map((sl) => (
                <li key={sl.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="w-2 text-gray-300 dark:text-gray-600">↳</span>
                  <span className="font-medium">{sl.category}</span>
                  <span>{formatHours(sl.hours)}</span>
                  <button
                    onClick={() => mutations.deleteSlice.mutate({ date, periodId: w.id, sliceId: sl.id })}
                    className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 leading-none"
                    aria-label={`Remove ${sl.category} slice`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {remainder > 0.001 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
              {formatHours(remainder)} →{' '}
              {w.category === UNCATEGORIZED_CATEGORY ? (
                <span className="text-amber-500 dark:text-amber-400">uncategorized</span>
              ) : (
                <span className="font-medium">{w.category}</span>
              )}
            </p>
          )}
          {addingSlice ? (
            <SliceForm
              categories={categories}
              onAdd={(sl) => {
                mutations.addSlice.mutate({ date, periodId: w.id, slice: sl })
                onAddSliceClose()
              }}
              onCancel={onAddSliceClose}
            />
          ) : (
            <button
              onClick={onAddSliceOpen}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              + add slice
            </button>
          )}
        </div>
      )}

      {/* Merge button */}
      {canMerge && (
        <div className="group relative flex justify-center -mb-2 z-10">
          <button
            onClick={() => {
              const laterEnd = next.end === null ? null : w.end! >= next.end ? w.end : next.end
              mutations.saveWithAbsorbed.mutate({ date, window: { ...w, end: laterEnd }, absorbed: [next.id] })
            }}
            className="text-base leading-none text-gray-400 opacity-30 hover:scale-125 hover:text-indigo-500 hover:opacity-100 transition-all"
            aria-label="Merge with next period"
          >
            🔗
          </button>
        </div>
      )}
    </li>
  )
}

function VariantA({ date, windows, categories, mutations }: VariantAProps) {
  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingSliceFor, setAddingSliceFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((w, i) => (
        <PeriodRowA
          key={w.id}
          w={w}
          next={sorted[i + 1] ?? null}
          date={date}
          categories={categories}
          mutations={mutations}
          isExpanded={expandedId === w.id}
          addingSlice={addingSliceFor === w.id}
          editingId={editingId}
          editStart={editStart}
          editEnd={editEnd}
          onToggleExpand={() => setExpandedId(expandedId === w.id ? null : w.id)}
          onAddSliceOpen={() => setAddingSliceFor(w.id)}
          onAddSliceClose={() => setAddingSliceFor(null)}
          onEditBegin={() => {
            setEditingId(w.id)
            setEditStart(w.start)
            setEditEnd(w.end ?? '')
          }}
          onEditSave={() => {
            mutations.saveWithAbsorbed.mutate({
              date,
              window: { ...w, start: editStart, end: editEnd || null },
              absorbed: [],
            })
            setEditingId(null)
          }}
          onEditCancel={() => setEditingId(null)}
          onEditStartChange={setEditStart}
          onEditEndChange={setEditEnd}
        />
      ))}
    </ul>
  )
}

// ─── Variant B: Card-based ───────────────────────────────────────────────────

function VariantB({ date, windows, categories, mutations }: VariantAProps) {
  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const [addingSliceFor, setAddingSliceFor] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((w) => {
        const duration = periodDuration(w)
        const slicedHours = w.slices.reduce((s, sl) => s + sl.hours, 0)
        const remainder = Math.max(0, duration - slicedHours)
        const uncategorized = w.category === UNCATEGORIZED_CATEGORY && remainder > 0.001

        return (
          <div key={w.id} className="rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Card header */}
            <div
              className={`flex items-center justify-between px-4 py-3 ${uncategorized ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-800/60'}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {w.start} – {w.end ?? '…'}
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-full px-2 py-0.5 border dark:border-gray-600">
                  {formatHours(duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
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

            {/* Card body: slices */}
            <div className="px-4 py-3 flex flex-col gap-2">
              {w.slices.map((sl) => (
                <div key={sl.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">{sl.category}</span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">{formatHours(sl.hours)}</span>
                  <button
                    onClick={() => mutations.deleteSlice.mutate({ date, periodId: w.id, sliceId: sl.id })}
                    className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-base leading-none"
                    aria-label={`Remove ${sl.category} slice`}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Remainder row */}
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
                  <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600 uppercase tracking-wide">
                    base
                  </span>
                </div>
              )}

              {/* Add slice form */}
              {addingSliceFor === w.id ? (
                <SliceForm
                  date={date}
                  categories={categories}
                  onAdd={(sl) => {
                    mutations.addSlice.mutate({ date, periodId: w.id, slice: sl })
                    setAddingSliceFor(null)
                  }}
                  onCancel={() => setAddingSliceFor(null)}
                />
              ) : (
                <button
                  onClick={() => setAddingSliceFor(w.id)}
                  className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 self-start mt-1"
                >
                  + split this period
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Variant C: Timeline ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  _COREMEDIA: 'bg-blue-400 dark:bg-blue-500',
  _RELEASE: 'bg-purple-400 dark:bg-purple-500',
  _SUPPORT: 'bg-orange-400 dark:bg-orange-500',
  _GUILDS: 'bg-teal-400 dark:bg-teal-500',
  _MAINT: 'bg-yellow-400 dark:bg-yellow-500',
  _INFRA: 'bg-cyan-400 dark:bg-cyan-500',
  _ARCH: 'bg-pink-400 dark:bg-pink-500',
  _TESTWATCH: 'bg-lime-400 dark:bg-lime-500',
  _OTHER: 'bg-gray-400 dark:bg-gray-500',
  _LEAVE: 'bg-emerald-400 dark:bg-emerald-500',
  [UNCATEGORIZED_CATEGORY]: 'bg-amber-200 dark:bg-amber-800',
}

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-indigo-400 dark:bg-indigo-500'
}

function VariantC({ date, windows, categories, mutations }: VariantAProps) {
  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start))
  const [addingSliceFor, setAddingSliceFor] = useState<string | null>(null)

  const totalHours = sorted.reduce((s, w) => s + periodDuration(w), 0)
  const categoryHours = calculateCategoryHours(windows)

  return (
    <div className="flex flex-col gap-4">
      {/* Timeline bar */}
      {totalHours > 0 && (
        <div className="rounded-lg overflow-hidden border dark:border-gray-700">
          <div className="flex h-8">
            {Object.entries(categoryHours).map(([cat, hours]) => {
              const pct = (hours / totalHours) * 100
              return (
                <div
                  key={cat}
                  style={{ width: `${pct}%` }}
                  className={`${categoryColor(cat)} relative group/bar`}
                  title={`${cat}: ${formatHours(hours)}`}
                >
                  {pct > 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 truncate px-1">
                      {cat.replace('_', '')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/40">
            {Object.entries(categoryHours).map(([cat, hours]) => (
              <span key={cat} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <span className={`inline-block w-2 h-2 rounded-sm ${categoryColor(cat)}`} />
                {cat.replace('_', '')} {formatHours(hours)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Period list */}
      <div className="flex flex-col gap-2">
        {sorted.map((w) => {
          const duration = periodDuration(w)
          const slicedHours = w.slices.reduce((s, sl) => s + sl.hours, 0)
          const remainder = Math.max(0, duration - slicedHours)
          const pct = totalHours > 0 ? (duration / totalHours) * 100 : 0

          return (
            <div key={w.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                {/* Time bar segment */}
                <div
                  className="h-4 rounded-sm shrink-0"
                  style={{ width: `${Math.max(pct, 4)}%`, minWidth: '1rem', maxWidth: '6rem' }}
                >
                  <div className={`h-full rounded-sm ${categoryColor(w.category)}`} />
                </div>
                <span className="font-mono text-xs font-medium text-gray-600 dark:text-gray-300 shrink-0">
                  {w.start}–{w.end ?? '…'}
                </span>
                <CategoryPicker
                  value={w.category}
                  categories={categories}
                  onChange={(cat) => mutations.setPeriodCategory.mutate({ date, periodId: w.id, category: cat })}
                  compact
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatHours(duration)}</span>
                <button
                  onClick={() => mutations.remove.mutate({ date, id: w.id })}
                  className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 leading-none"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>

              {/* Slices */}
              {w.slices.length > 0 && (
                <div className="ml-6 flex flex-col gap-0.5">
                  {w.slices.map((sl) => (
                    <div key={sl.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`inline-block w-1.5 h-1.5 rounded-sm ${categoryColor(sl.category)}`} />
                      <span>{sl.category}</span>
                      <span>{formatHours(sl.hours)}</span>
                      <button
                        onClick={() => mutations.deleteSlice.mutate({ date, periodId: w.id, sliceId: sl.id })}
                        className="ml-auto text-gray-300 hover:text-red-500 leading-none"
                        aria-label="Remove slice"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {remainder > 0.001 && w.slices.length > 0 && (
                <div className="ml-6 text-xs text-gray-400 dark:text-gray-500">
                  ↳{' '}
                  {w.category === UNCATEGORIZED_CATEGORY ? (
                    <span className="text-amber-500">uncategorized</span>
                  ) : (
                    w.category
                  )}{' '}
                  {formatHours(remainder)} (base)
                </div>
              )}

              {addingSliceFor === w.id ? (
                <div className="ml-6">
                  <SliceForm
                    categories={categories}
                    onAdd={(sl) => {
                      mutations.addSlice.mutate({ date, periodId: w.id, slice: sl })
                      setAddingSliceFor(null)
                    }}
                    onCancel={() => setAddingSliceFor(null)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingSliceFor(w.id)}
                  className="ml-6 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 self-start"
                >
                  + split
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main WorkPeriodPanel ─────────────────────────────────────────────────────

export function WorkPeriodPanel({
  date,
  windows,
  repository,
  autoCategory,
  customCategories = [],
  categoryOrder,
  variant,
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

  const variantProps: VariantAProps = { date, windows: sorted, categories, mutations }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">No periods recorded yet</p>
      ) : (
        <>
          {variant === 'A' && <VariantA {...variantProps} />}
          {variant === 'B' && <VariantB {...variantProps} />}
          {variant === 'C' && <VariantC {...variantProps} />}
        </>
      )}
      <AddPeriodForm
        date={date}
        windows={windows}
        defaultCategory={defaultCategory}
        categories={categories}
        onAdd={handleAdd}
      />
    </div>
  )
}
