import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository } from '../repositories/types'
import type { ExcelRow } from '../services/workbookService'
import { GraphApiWorkbookService, LocalFolderWorkbookService } from '../services/workbookService'
import { getAllCategories } from '../domain/categories'
import { useAuthStore } from '../stores/authStore'
import { getAccessToken } from '../auth/msalInstance'
import { isLocalFolderMode } from '../auth/bootstrapConfig'

const localFolder = isLocalFolderMode()

function matchScore(a: string, b: string): number {
  if (a.length < 3 || b.length < 3) return 0
  if (a.includes(b)) return b.length / a.length
  if (b.includes(a)) return a.length / b.length
  return 0
}

function autoMatchCategories(
  categories: string[],
  rows: ExcelRow[],
  existingMapping: Record<string, string>,
): Record<string, string> {
  const result = { ...existingMapping }
  for (const category of categories) {
    if (result[category]) continue
    const catNorm = category.toLowerCase().replace(/[^a-z0-9]/g, '')
    let bestScore = 0
    let bestRow: ExcelRow | null = null
    for (const row of rows) {
      const desc = row.description.toLowerCase().replace(/[^a-z0-9]/g, '')
      const taskNorm = row.taskId.toLowerCase().replace(/[^a-z0-9]/g, '')
      const score = Math.max(matchScore(catNorm, desc), matchScore(catNorm, taskNorm))
      if (score > bestScore) {
        bestScore = score
        bestRow = row
      }
    }
    if (bestRow && bestScore >= 0.5) result[category] = bestRow.taskId
  }
  return result
}

interface Props {
  repository: ConfigRepository
}

export function CategorySettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Category management state
  const [newCategory, setNewCategory] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Excel mapping state
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingRows, setLoadingRows] = useState(false)
  const [localMapping, setLocalMapping] = useState<Record<string, string> | null>(null)
  const [autoMatched, setAutoMatched] = useState<Set<string>>(new Set())
  const [mappingSaved, setMappingSaved] = useState(false)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const categoryMutation = useMutation({
    mutationFn: (updates: { customCategories?: string[]; categoryOrder?: string[] }) =>
      repository.save({ ...config!, ...updates }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const mappingMutation = useMutation({
    mutationFn: async ({
      mapping,
      newCustomCategories,
    }: {
      mapping: Record<string, string>
      newCustomCategories: string[]
    }) => {
      const current = await repository.get()
      const mergedCustom = [
        ...current.customCategories,
        ...newCustomCategories.filter((c) => !current.customCategories.includes(c)),
      ]
      await repository.save({ ...current, categoryMapping: mapping, customCategories: mergedCustom })
    },
    onSuccess: () => {
      setLocalMapping(null)
      setAutoMatched(new Set())
      setMappingSaved(true)
      setTimeout(() => setMappingSaved(false), 2000)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
    },
  })

  if (!config) return null

  const { customCategories } = config
  const categories = getAllCategories(customCategories, config.categoryOrder)
  const savedMapping = config.categoryMapping ?? {}
  const activeMapping = localMapping ?? savedMapping
  const mappedTaskIds = new Set(Object.values(activeMapping))
  const unmappedRows = excelRows.filter((r) => !mappedTaskIds.has(r.taskId))

  const sharepointUrl = config.sharepointUrl
  const targetSheet = config.targetSheet
  const localExcelFile = config.localExcelFile
  const excelReady = localFolder
    ? !!localExcelFile && !!targetSheet
    : !!sharepointUrl && !!targetSheet && isAuthenticated

  // ── Category management handlers ────────────────────────────────────────────

  function handleAdd() {
    const trimmed = newCategory.trim()
    if (!trimmed || categories.includes(trimmed)) return
    const newCustom = [...customCategories, trimmed]
    const newOrder = [...categories, trimmed]
    categoryMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
    setNewCategory('')
  }

  function handleRemove(idx: number) {
    const cat = categories[idx]
    const newOrder = categories.filter((_, i) => i !== idx)
    const newCustom = customCategories.filter((c) => c !== cat)
    categoryMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
  }

  function handleRename(idx: number) {
    const trimmed = editValue.trim()
    const oldName = categories[idx]
    if (!trimmed || trimmed === oldName || categories.includes(trimmed)) {
      setEditingIdx(null)
      return
    }
    const newOrder = categories.map((c, i) => (i === idx ? trimmed : c))
    const newCustom = customCategories.map((c) => (c === oldName ? trimmed : c))
    if (!customCategories.includes(oldName)) newCustom.push(trimmed)
    categoryMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
    setEditingIdx(null)
  }

  function handleDragStart(idx: number) { dragIdx.current = idx }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDrop(idx: number) {
    const from = dragIdx.current
    if (from === null || from === idx) { dragIdx.current = null; setDragOverIdx(null); return }
    const newOrder = [...categories]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(idx, 0, moved)
    categoryMutation.mutate({ categoryOrder: newOrder })
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() { dragIdx.current = null; setDragOverIdx(null) }

  // ── Excel mapping handlers ───────────────────────────────────────────────────

  async function handleLoadRows() {
    setLoadError(null)
    setLoadingRows(true)
    try {
      if (!targetSheet) return
      let service
      if (localFolder) {
        if (!localExcelFile) return
        service = new LocalFolderWorkbookService(localExcelFile)
      } else {
        if (!sharepointUrl || !isAuthenticated) return
        service = new GraphApiWorkbookService(sharepointUrl, getAccessToken)
      }
      const rows = await service.listRows(targetSheet)
      setExcelRows(rows)
      const merged = autoMatchCategories(categories, rows, savedMapping)
      setAutoMatched(new Set(Object.keys(merged).filter((k) => !savedMapping[k] && merged[k])))
      setLocalMapping(merged)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load rows')
    } finally {
      setLoadingRows(false)
    }
  }

  function handleMappingChange(category: string, taskId: string) {
    setAutoMatched((prev) => { const s = new Set(prev); s.delete(category); return s })
    setLocalMapping((prev) => ({ ...(prev ?? savedMapping), [category]: taskId }))
  }

  function handleSaveMapping() {
    if (!localMapping) return
    mappingMutation.mutate({ mapping: localMapping, newCustomCategories: [] })
  }

  function handleAddAsCategory(row: ExcelRow) {
    const name = row.description || row.taskId
    const newMapping = { ...(localMapping ?? savedMapping), [name]: row.taskId }
    mappingMutation.mutate({ mapping: newMapping, newCustomCategories: [name] })
  }

  const isDirty = localMapping !== null

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Categories</span>
        <div className="flex items-center gap-2">
          {!excelReady && excelRows.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {localFolder
                ? (!localExcelFile ? 'Select an Excel file to map' : !targetSheet ? 'Select a sheet to map' : '')
                : (!sharepointUrl ? 'Set SharePoint URL to map' : !targetSheet ? 'Select a sheet to map' : !isAuthenticated ? 'Sign in to map' : '')}
            </span>
          )}
          <button
            onClick={() => void handleLoadRows()}
            disabled={!excelReady || loadingRows}
            className="rounded border px-2.5 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-40"
          >
            {loadingRows ? 'Loading…' : excelRows.length > 0 ? 'Reload from Excel' : 'Load Excel mapping'}
          </button>
        </div>
      </div>

      {loadError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{loadError}</p>}

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 text-xs font-medium text-gray-400 dark:text-gray-500">
        <span className="w-4 shrink-0" aria-hidden />
        <span className="w-36 shrink-0">Category</span>
        <span className="w-4 shrink-0 text-center" aria-hidden>→</span>
        <span className="flex-1">Excel row</span>
      </div>

      {/* Category list */}
      <ul className="flex flex-col gap-1">
        {categories.map((cat, idx) => {
          const isCustom = customCategories.includes(cat)
          const taskId = activeMapping[cat] ?? ''
          const isAutoMatch = autoMatched.has(cat)

          return (
            <li
              key={cat}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-1.5 text-sm cursor-grab active:cursor-grabbing ${dragOverIdx === idx ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/40' : ''}`}
            >
              <span className="text-gray-300 dark:text-gray-600 select-none shrink-0" aria-hidden>⠿</span>

              {/* Category name */}
              {editingIdx === idx ? (
                <input
                  aria-label={`Rename ${cat}`}
                  ref={(el) => { el?.focus() }}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleRename(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(idx)
                    if (e.key === 'Escape') setEditingIdx(null)
                  }}
                  className="w-36 rounded border px-2 py-0.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              ) : (
                <span
                  className={`w-36 shrink-0 truncate cursor-pointer ${isCustom ? 'text-indigo-700 dark:text-indigo-300' : ''}`}
                  onDoubleClick={() => { setEditingIdx(idx); setEditValue(cat) }}
                  title={isCustom ? 'Custom — double-click to rename' : 'Double-click to rename'}
                >
                  {cat}
                </span>
              )}

              <span className="w-4 shrink-0 text-center text-xs text-gray-300 dark:text-gray-600" aria-hidden>→</span>

              {/* Excel mapping */}
              <div className="flex flex-1 items-center gap-1 min-w-0">
                {excelRows.length > 0 ? (
                  <>
                    {isAutoMatch && (
                      <span
                        className="shrink-0 rounded bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                        title="Auto-matched — please verify"
                      >
                        auto
                      </span>
                    )}
                    <select
                      aria-label={`Excel mapping for ${cat}`}
                      value={taskId}
                      onChange={(e) => handleMappingChange(cat, e.target.value)}
                      className="flex-1 rounded border px-2 py-0.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-w-0"
                    >
                      <option value="">— not mapped —</option>
                      {excelRows.map((row) => (
                        <option key={row.taskId} value={row.taskId}>
                          {row.taskId}{row.description ? ` — ${row.description}` : ''}
                        </option>
                      ))}
                    </select>
                  </>
                ) : taskId ? (
                  <span
                    className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:text-gray-400 truncate"
                    title={taskId}
                  >
                    {taskId}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                )}
              </div>

              <button
                aria-label={`Remove ${cat}`}
                onClick={() => handleRemove(idx)}
                className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>

      {/* Unmapped Excel rows */}
      {unmappedRows.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 p-3">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Rows in Excel not yet mapped to any category:
          </p>
          <ul className="flex flex-col gap-1">
            {unmappedRows.map((row) => (
              <li key={row.taskId} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-mono">{row.taskId}</span>
                  {row.description ? ` — ${row.description}` : ''}
                </span>
                <button
                  onClick={() => handleAddAsCategory(row)}
                  className="shrink-0 rounded border border-indigo-300 dark:border-indigo-700 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                >
                  + Add as category
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mapping save row */}
      {isDirty && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveMapping}
            disabled={mappingMutation.isPending}
            className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-50"
          >
            Save mapping
          </button>
          {mappingMutation.isError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">Failed to save.</p>
          )}
        </div>
      )}
      {mappingSaved && !isDirty && (
        <span className="text-xs text-green-700 dark:text-emerald-400">✓ Mapping saved</span>
      )}

      {/* Add category */}
      <div className="flex gap-2">
        <input
          aria-label="New category"
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="New category name"
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
        Drag to reorder. Double-click to rename.{' '}
        {Object.keys(savedMapping).length > 0 && excelRows.length === 0
          ? `${Object.keys(savedMapping).length} categories mapped — load Excel to edit.`
          : 'Load Excel mapping to link categories to Task IDs.'}
      </p>
    </div>
  )
}
