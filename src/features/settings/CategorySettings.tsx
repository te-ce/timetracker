import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import type { ExcelRow } from '../excel/workbookService'
import { buildWorkbookService } from '../excel/workbookFactory'
import { getAllCategories, isValidCustomCategoryName } from '../../shared/categories'
import { useDragReorder } from '../../shared/reorder'
import { autoMatchCategories } from './excelMapping'
import { useAuthStore } from '../../shared/authStore'
import { isLocalFolderMode } from '../../infra/auth/bootstrapConfig'
import { requireConfig } from '../../shared/appConfigDefaults'
import { CategoryMappingSaveRow } from './CategoryMappingSaveRow'
import { CategorySettingsRow } from './CategorySettingsRow'
import { UnmappedCategoryRowsSection } from './UnmappedCategoryRowsSection'

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
    }) => repository.save({ ...requireConfig(config), ...updates }),
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

  const categories = config ? getAllCategories(config.customCategories, config.categoryOrder) : []
  const { dragOverIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    categories,
    (newOrder) => categoryMutation.mutate({ categoryOrder: newOrder }),
  )

  if (!config) return null

  const { customCategories } = config
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
