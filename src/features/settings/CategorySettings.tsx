import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import type { ExcelRow } from '../excel/excelService'
import { buildWorkbookService } from '../excel/workbookFactory'
import { getAllCategories, isValidCustomCategoryName } from '../../shared/categories'
import { autoMatchCategories } from './excelMapping'
import { useAuthStore } from '../../shared/authStore'
import { isLocalFolderMode } from '../../infra/auth/bootstrapConfig'

const localFolder = isLocalFolderMode()

function getMappingHint(
  sharepointUrl: string | undefined,
  localExcelFile: string | undefined | null,
  targetSheet: string | undefined | null,
  isAuthenticated: boolean,
): string {
  if (localFolder) {
    if (!localExcelFile) return 'Select an Excel file to map'
    if (!targetSheet) return 'Select a sheet to map'
    return ''
  }
  if (!sharepointUrl) return 'Set SharePoint URL to map'
  if (!targetSheet) return 'Select a sheet to map'
  if (!isAuthenticated) return 'Sign in to map'
  return ''
}

function computeExcelReady(
  sharepointUrl: string | undefined | null,
  localExcelFile: string | undefined | null,
  targetSheet: string | undefined | null,
  isAuthenticated: boolean,
): boolean {
  if (localFolder) return !!localExcelFile && !!targetSheet
  return !!sharepointUrl && !!targetSheet && isAuthenticated
}

function loadButtonLabel(loadingRows: boolean, hasRows: boolean): string {
  if (loadingRows) return 'Loading…'
  return hasRows ? 'Reload from Excel' : 'Load Excel mapping'
}

function mappingFooterText(savedMapping: Record<string, string>, hasRows: boolean): string {
  const count = Object.keys(savedMapping).length
  if (count > 0 && !hasRows) return `${count} categories mapped — load Excel to edit.`
  return 'Load Excel mapping to link categories to Task IDs.'
}

interface UnmappedCategoryRowsSectionProps {
  unmappedRows: ExcelRow[]
  onAddAsCategory: (row: ExcelRow) => void
}

function UnmappedCategoryRowsSection({ unmappedRows, onAddAsCategory }: UnmappedCategoryRowsSectionProps) {
  if (unmappedRows.length === 0) return null
  return (
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
              type="button"
              onClick={() => onAddAsCategory(row)}
              className="shrink-0 rounded border border-indigo-300 dark:border-indigo-700 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            >
              + Add as category
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface CategoryMappingSaveRowProps {
  isDirty: boolean
  isPending: boolean
  isError: boolean
  isSaved: boolean
  onSave: () => void
}

function CategoryMappingSaveRow({ isDirty, isPending, isError, isSaved, onSave }: CategoryMappingSaveRowProps) {
  return (
    <>
      {isDirty && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-50"
          >
            Save mapping
          </button>
          {isError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              Failed to save.
            </p>
          )}
        </div>
      )}
      {isSaved && !isDirty && <span className="text-xs text-green-700 dark:text-emerald-400">✓ Mapping saved</span>}
    </>
  )
}

interface CategorySettingsRowProps {
  cat: string
  idx: number
  isCustom: boolean
  taskId: string
  isAutoMatch: boolean
  dragOverIdx: number | null
  categoryDescription: string | undefined
  excelRows: ExcelRow[]
  onDragStart: (idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDrop: (idx: number) => void
  onDragEnd: () => void
  onRename: (idx: number, newName: string) => void
  onSaveDesc: (idx: number, newDesc: string) => void
  onMappingChange: (cat: string, taskId: string) => void
  onRemove: (idx: number) => void
}

function CategorySettingsRow({
  cat,
  idx,
  isCustom,
  taskId,
  isAutoMatch,
  dragOverIdx,
  categoryDescription,
  excelRows,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRename,
  onSaveDesc,
  onMappingChange,
  onRemove,
}: CategorySettingsRowProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState('')

  const dragOverClass =
    dragOverIdx === idx ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/40' : ''
  const nameClass = `truncate cursor-pointer ${isCustom ? 'text-indigo-700 dark:text-indigo-300' : ''}`
  const nameTitle = isCustom ? 'Custom — double-click to rename' : 'Double-click to rename'
  return (
    <div
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
        onDragStart(idx)
      }}
      onDragOver={(e) => onDragOver(e, idx)}
      onDrop={() => onDrop(idx)}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          onDragStart(idx)
          onDrop(idx - 1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          onDragStart(idx)
          onDrop(idx + 1)
        }
      }}
      className={`flex items-center gap-2 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-1.5 text-sm cursor-grab active:cursor-grabbing ${dragOverClass}`}
    >
      <span className="text-gray-300 dark:text-gray-600 select-none shrink-0" aria-hidden>
        ⠿
      </span>
      <div className="w-36 shrink-0 flex flex-col gap-0.5 min-w-0">
        {editingName ? (
          <input
            aria-label={`Rename ${cat}`}
            ref={(el) => {
              el?.focus()
            }}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => {
              onRename(idx, nameValue)
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRename(idx, nameValue)
                setEditingName(false)
              }
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="rounded border px-2 py-0.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        ) : (
          <span
            className={nameClass}
            onDoubleClick={() => {
              setEditingName(true)
              setNameValue(cat)
            }}
            data-tooltip={nameTitle}
          >
            {cat}
          </span>
        )}
        {editingDesc ? (
          <input
            aria-label={`Description for ${cat}`}
            ref={(el) => {
              el?.focus()
            }}
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={() => {
              onSaveDesc(idx, descValue)
              setEditingDesc(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveDesc(idx, descValue)
                setEditingDesc(false)
              }
              if (e.key === 'Escape') setEditingDesc(false)
            }}
            placeholder="Add description…"
            className="rounded border px-1.5 py-0.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        ) : (
          <button
            type="button"
            aria-label={`Edit description for ${cat}`}
            className="truncate text-left text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => {
              setEditingDesc(true)
              setDescValue(categoryDescription ?? '')
            }}
            data-tooltip="Click to edit description"
          >
            {categoryDescription ?? <em>add description</em>}
          </button>
        )}
      </div>
      <span className="w-4 shrink-0 text-center text-xs text-gray-300 dark:text-gray-600" aria-hidden>
        →
      </span>
      <div className="flex flex-1 items-center gap-1 min-w-0">
        {excelRows.length > 0 ? (
          <>
            {isAutoMatch && (
              <span
                className="shrink-0 rounded bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                data-tooltip="Auto-matched — please verify"
              >
                auto
              </span>
            )}
            <select
              aria-label={`Excel mapping for ${cat}`}
              value={taskId}
              onChange={(e) => onMappingChange(cat, e.target.value)}
              className="flex-1 rounded border px-2 py-0.5 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-w-0"
            >
              <option value="">— not mapped —</option>
              {excelRows.map((row) => (
                <option key={row.taskId} value={row.taskId}>
                  {row.taskId}
                  {row.description ? ` — ${row.description}` : ''}
                </option>
              ))}
            </select>
          </>
        ) : taskId ? (
          <span
            className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:text-gray-400 truncate"
            data-tooltip={taskId}
          >
            {taskId}
          </span>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </div>
      <button
        type="button"
        aria-label={`Remove ${cat}`}
        onClick={() => onRemove(idx)}
        className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium p-1 rounded"
      >
        ✕
      </button>
    </div>
  )
}

function resolveMappingHint(
  url: string | null | undefined,
  file: string | null | undefined,
  sheet: string | null | undefined,
  auth: boolean,
): string {
  return getMappingHint(url ?? undefined, file, sheet ?? undefined, auth)
}

function shouldShowMappingHint(excelReady: boolean, rowCount: number, hint: string): boolean {
  return !excelReady && rowCount === 0 && hint !== ''
}

interface Props {
  repository: ConfigRepository
}

export function CategorySettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [newCategory, setNewCategory] = useState('')
  const dragIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

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
    mutationFn: (updates: {
      customCategories?: string[]
      categoryOrder?: string[]
      categoryDescriptions?: Record<string, string>
      categoryImportOrder?: string[]
    }) => repository.save({ ...config!, ...updates }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  const mappingMutation = useMutation({
    mutationFn: async ({
      mapping,
      newCustomCategories,
      importOrder,
    }: {
      mapping: Record<string, string>
      newCustomCategories: string[]
      importOrder?: string[] | undefined
    }) => {
      const current = await repository.get()
      const existingCustomCategoriesSet = new Set(current.customCategories)
      const mergedCustom = [
        ...current.customCategories,
        ...newCustomCategories.filter((c) => !existingCustomCategoriesSet.has(c)),
      ]
      const update: typeof current = { ...current, categoryMapping: mapping, customCategories: mergedCustom }
      if (importOrder) update.categoryImportOrder = importOrder
      await repository.save(update)
    },
    onSuccess: () => {
      setLocalMapping(null)
      setAutoMatched(new Set())
      setMappingSaved(true)
      setTimeout(() => setMappingSaved(false), 2000)
      invalidateConfig(queryClient)
    },
  })

  if (!config) return null

  const { customCategories } = config
  const categories = getAllCategories(customCategories, config.categoryOrder)
  const customCategoriesSet = new Set(customCategories)
  const savedMapping = config.categoryMapping ? config.categoryMapping : {}
  const activeMapping = localMapping !== null ? localMapping : savedMapping
  const mappedTaskIds = new Set(Object.values(activeMapping))
  const unmappedRows = excelRows.filter((r) => !mappedTaskIds.has(r.taskId))

  const sharepointUrl = config.sharepointUrl
  const targetSheet = config.targetSheet
  const localExcelFile = config.localExcelFile
  const excelReady = computeExcelReady(sharepointUrl, localExcelFile, targetSheet, isAuthenticated)

  function handleAdd() {
    const trimmed = newCategory.trim()
    if (!isValidCustomCategoryName(trimmed) || categories.includes(trimmed)) return
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

  function handleRename(idx: number, newName: string) {
    const trimmed = newName.trim()
    const oldName = categories[idx]
    if (!trimmed || !oldName || trimmed === oldName || categories.includes(trimmed)) return
    const newOrder = categories.map((c, i) => (i === idx ? trimmed : c))
    const newCustom = customCategories.map((c) => (c === oldName ? trimmed : c))
    if (!customCategories.includes(oldName)) newCustom.push(trimmed)
    categoryMutation.mutate({ customCategories: newCustom, categoryOrder: newOrder })
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
    const to = Math.max(0, Math.min(idx, categories.length - 1))
    if (from === null || from === to) {
      dragIdx.current = null
      setDragOverIdx(null)
      return
    }
    const newOrder = [...categories]
    const spliced = newOrder.splice(from, 1)
    const moved = spliced[0]
    if (moved === undefined) return
    newOrder.splice(to, 0, moved)
    categoryMutation.mutate({ categoryOrder: newOrder })
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  function handleSaveDesc(idx: number, newDesc: string) {
    if (!config) return
    const cat = categories[idx]
    if (!cat) return
    const trimmed = newDesc.trim()
    const descs = { ...config.categoryDescriptions }
    if (trimmed) descs[cat] = trimmed
    else delete descs[cat]
    categoryMutation.mutate({ categoryDescriptions: descs })
  }

  function handleResetToImportOrder() {
    if (!config?.categoryImportOrder) return
    categoryMutation.mutate({ categoryOrder: config.categoryImportOrder })
  }

  async function handleLoadRows() {
    setLoadError(null)
    setLoadingRows(true)
    try {
      if (!targetSheet) return
      const service = buildWorkbookService(config, isAuthenticated)
      if (!service) return
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
    setAutoMatched((prev) => {
      const s = new Set(prev)
      s.delete(category)
      return s
    })
    setLocalMapping((prev) => ({ ...(prev ?? savedMapping), [category]: taskId }))
  }

  function handleSaveMapping() {
    if (!localMapping) return
    const rowIdx = new Map(excelRows.map((r, i) => [r.taskId, i]))
    const importOrder = categories.toSorted((a, b) => {
      const ai = localMapping[a] !== undefined ? (rowIdx.get(localMapping[a]) ?? Infinity) : Infinity
      const bi = localMapping[b] !== undefined ? (rowIdx.get(localMapping[b]) ?? Infinity) : Infinity
      return ai - bi
    })
    mappingMutation.mutate({ mapping: localMapping, newCustomCategories: [], importOrder })
  }

  function handleAddAsCategory(row: ExcelRow) {
    const name = row.description || row.taskId
    const newMapping = { ...(localMapping ?? savedMapping), [name]: row.taskId }
    mappingMutation.mutate({ mapping: newMapping, newCustomCategories: [name], importOrder: undefined })
  }

  const isDirty = localMapping !== null
  const mappingHint = resolveMappingHint(sharepointUrl, localExcelFile, targetSheet, isAuthenticated)
  const showMappingHint = shouldShowMappingHint(excelReady, excelRows.length, mappingHint)

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Categories</span>
        <div className="flex items-center gap-2">
          {config.categoryImportOrder && (
            <button
              type="button"
              onClick={handleResetToImportOrder}
              className="rounded border px-2.5 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              data-tooltip="Reset sort order to the order categories appeared in Excel"
            >
              Reset to Excel order
            </button>
          )}
          {showMappingHint && <span className="text-xs text-gray-400 dark:text-gray-500">{mappingHint}</span>}
          <button
            type="button"
            onClick={() => void handleLoadRows()}
            disabled={!excelReady || loadingRows}
            className="rounded border px-2.5 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-40"
          >
            {loadButtonLabel(loadingRows, excelRows.length > 0)}
          </button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {loadError}
        </p>
      )}

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 text-xs font-medium text-gray-400 dark:text-gray-500">
        <span className="w-4 shrink-0" aria-hidden />
        <span className="w-36 shrink-0">Category</span>
        <span className="w-4 shrink-0 text-center" aria-hidden>
          →
        </span>
        <span className="flex-1">Excel row</span>
      </div>

      {/* Category list */}
      <div role="listbox" aria-label="Categories" className="flex flex-col gap-1">
        {categories.map((cat, idx) => (
          <CategorySettingsRow
            key={cat}
            cat={cat}
            idx={idx}
            isCustom={customCategoriesSet.has(cat)}
            taskId={activeMapping[cat] ?? ''}
            isAutoMatch={autoMatched.has(cat)}
            dragOverIdx={dragOverIdx}
            categoryDescription={config.categoryDescriptions?.[cat]}
            excelRows={excelRows}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onRename={handleRename}
            onSaveDesc={handleSaveDesc}
            onMappingChange={handleMappingChange}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <UnmappedCategoryRowsSection unmappedRows={unmappedRows} onAddAsCategory={handleAddAsCategory} />

      <CategoryMappingSaveRow
        isDirty={isDirty}
        isPending={mappingMutation.isPending}
        isError={mappingMutation.isError}
        isSaved={mappingSaved}
        onSave={handleSaveMapping}
      />

      {/* Add category */}
      <div className="flex gap-2">
        <input
          aria-label="New category"
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="New category name"
          className="flex-1 rounded border px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400"
        >
          Add
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Drag to reorder. Double-click to rename. {mappingFooterText(savedMapping, excelRows.length > 0)}
      </p>
    </div>
  )
}
