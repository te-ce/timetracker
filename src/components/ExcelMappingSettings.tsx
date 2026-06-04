import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { AppConfig, ConfigRepository } from '../repositories/types'
import type { ExcelRow, WorkbookService } from '../services/workbookService'
import { GraphApiWorkbookService, LocalFolderWorkbookService } from '../services/workbookService'
import { getAllCategories } from '../domain/categories'
import { autoMatchCategories } from '../domain/excelMapping'
import { DEFAULT_CATEGORIES } from '../repositories/types'
import { useAuthStore } from '../stores/authStore'
import { getAccessToken } from '../auth/msalInstance'
import { isLocalFolderMode } from '../auth/bootstrapConfig'

const localFolder = isLocalFolderMode()

function buildWorkbookService(
  sharepointUrl: string | undefined,
  localExcelFile: string | undefined | null,
  isAuthenticated: boolean,
): WorkbookService | null {
  if (localFolder) {
    if (!localExcelFile) return null
    return new LocalFolderWorkbookService(localExcelFile)
  }
  if (!sharepointUrl || !isAuthenticated) return null
  return new GraphApiWorkbookService(sharepointUrl, getAccessToken)
}

function resolveNotReadyHint(url: string | null | undefined, file: string | null | undefined): string {
  return getNotReadyHint(url ?? undefined, file)
}

function getNotReadyHint(sharepointUrl: string | undefined, localExcelFile: string | undefined | null): string {
  if (localFolder) {
    return !localExcelFile ? 'Select an Excel file first' : 'Select a target sheet first'
  }
  return !sharepointUrl ? 'Set a SharePoint URL first' : 'Select a target sheet first'
}

function computeIsReady(
  sharepointUrl: string | undefined,
  localExcelFile: string | undefined | null,
  targetSheet: string | undefined | null,
  isAuthenticated: boolean,
): boolean {
  if (localFolder) return !!localExcelFile && !!targetSheet
  return !!sharepointUrl && !!targetSheet && isAuthenticated
}

interface ServiceParams {
  sharepointUrl: string | undefined | null
  targetSheet: string | undefined | null
  localExcelFile: string | undefined | null
  isReady: boolean
}

function resolveServiceParams(config: AppConfig | undefined, isAuthenticated: boolean): ServiceParams {
  const sharepointUrl = config ? config.sharepointUrl : undefined
  const targetSheet = config ? config.targetSheet : undefined
  const localExcelFile = config ? config.localExcelFile : undefined
  const isReady = computeIsReady(sharepointUrl ?? undefined, localExcelFile, targetSheet, isAuthenticated)
  return { sharepointUrl, targetSheet, localExcelFile, isReady }
}

function resolveActiveMapping(
  localMapping: Record<string, string> | null,
  savedMapping: Record<string, string>,
): Record<string, string> {
  return localMapping !== null ? localMapping : savedMapping
}

interface MappingRowProps {
  category: string
  isFixed: boolean
  currentTaskId: string
  isAutoMatched: boolean
  excelRows: ExcelRow[]
  onClearAutoMatch: (category: string) => void
  onMappingChange: (category: string, taskId: string) => void
}

function MappingRow({
  category,
  isFixed,
  currentTaskId,
  isAutoMatched,
  excelRows,
  onClearAutoMatch,
  onMappingChange,
}: MappingRowProps) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`w-40 truncate text-sm font-medium ${isFixed ? '' : 'text-indigo-700 dark:text-indigo-300'}`}
        data-tooltip={category}
      >
        {category}
        {!isFixed && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">(custom)</span>}
      </span>
      <div className="relative flex flex-1 items-center gap-1">
        {isAutoMatched && (
          <span
            className="shrink-0 rounded bg-amber-100 dark:bg-amber-900/30 px-1 py-0.5 text-xs text-amber-700 dark:text-amber-400"
            data-tooltip="Auto-matched by name — please verify"
          >
            auto
          </span>
        )}
        <select
          aria-label={`Map ${category} to Task ID`}
          value={currentTaskId}
          onChange={(e) => {
            onClearAutoMatch(category)
            onMappingChange(category, e.target.value)
          }}
          className="flex-1 rounded border px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">— skip —</option>
          {excelRows.map((row) => (
            <option key={row.taskId} value={row.taskId}>
              {row.taskId}
              {row.description ? ` — ${row.description}` : ''}
            </option>
          ))}
        </select>
      </div>
    </li>
  )
}

interface UnmappedRowsSectionProps {
  unmappedRows: ExcelRow[]
  onAddAsCategory: (row: ExcelRow) => void
}

function UnmappedRowsSection({ unmappedRows, onAddAsCategory }: UnmappedRowsSectionProps) {
  if (unmappedRows.length === 0) return null
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 p-3">
      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
        Investment rows — not yet mapped to any category:
      </p>
      <ul className="flex flex-col gap-1">
        {unmappedRows.map((row) => (
          <li key={row.taskId} className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-700 dark:text-gray-300">
              <span className="font-mono">{row.taskId}</span>
              {row.description ? ` — ${row.description}` : ''}
            </span>
            <button
              onClick={() => onAddAsCategory(row)}
              className="rounded border border-indigo-300 dark:border-indigo-700 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            >
              + Add as category
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface MappingSaveRowProps {
  isDirty: boolean
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  onSave: () => void
}

function MappingSaveRow({ isDirty, isPending, isSuccess, isError, onSave }: MappingSaveRowProps) {
  return (
    <div className="flex items-center gap-3">
      {isDirty && (
        <button
          onClick={onSave}
          disabled={isPending}
          className="rounded bg-indigo-600 dark:bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-50"
        >
          Save mapping
        </button>
      )}
      {isSuccess && !isDirty && <span className="text-xs text-green-700 dark:text-emerald-400">✓ Mapping saved</span>}
      {isError && (
        <p role="alert" className="text-xs text-red-600">
          Failed to save mapping.
        </p>
      )}
    </div>
  )
}

interface Props {
  repository: ConfigRepository
}

export function ExcelMappingSettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })

  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingRows, setLoadingRows] = useState(false)
  const [localMapping, setLocalMapping] = useState<Record<string, string> | null>(null)
  const [autoMatched, setAutoMatched] = useState<Set<string>>(new Set())

  const { sharepointUrl, targetSheet, localExcelFile, isReady } = resolveServiceParams(config, isAuthenticated)

  async function handleLoadRows() {
    setLoadError(null)
    setLoadingRows(true)
    try {
      if (!targetSheet) return
      const service = buildWorkbookService(sharepointUrl ?? undefined, localExcelFile, isAuthenticated)
      if (!service) return
      const rows = await service.listRows(targetSheet)
      setExcelRows(rows)
      const saved = config ? (config.categoryMapping ?? {}) : {}
      const allCats = getAllCategories(config ? config.customCategories : [], config ? config.categoryOrder : undefined)
      const merged = autoMatchCategories(allCats, rows, saved)
      const newAutoMatched = new Set(Object.keys(merged).filter((k) => !saved[k] && merged[k]))
      setAutoMatched(newAutoMatched)
      setLocalMapping(merged)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load rows')
    } finally {
      setLoadingRows(false)
    }
  }

  async function saveMappingFn({
    mapping,
    newCustomCategories,
  }: {
    mapping: Record<string, string>
    newCustomCategories: string[]
  }) {
    const current = await repository.get()
    const mergedCustom = [
      ...current.customCategories,
      ...newCustomCategories.filter((c) => !current.customCategories.includes(c)),
    ]
    await repository.save({ ...current, categoryMapping: mapping, customCategories: mergedCustom })
  }

  const saveMutation = useMutation({
    mutationFn: saveMappingFn,
    onSuccess: () => {
      setLocalMapping(null)
      setAutoMatched(new Set())
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
    },
  })

  if (!config) return null

  const allCategories = getAllCategories(config.customCategories, config.categoryOrder)
  const savedCategoryMapping = config.categoryMapping ? config.categoryMapping : {}
  const activeMapping = resolveActiveMapping(localMapping, savedCategoryMapping)
  const defaultCategorySet = new Set<string>(DEFAULT_CATEGORIES)

  const mappedTaskIds = new Set(Object.values(activeMapping))
  const unmappedRows = excelRows.filter((r) => !mappedTaskIds.has(r.taskId))

  function handleMappingChange(category: string, taskId: string) {
    const base = resolveActiveMapping(localMapping, savedCategoryMapping)
    setLocalMapping({ ...base, [category]: taskId })
  }

  function handleClearAutoMatch(category: string) {
    setAutoMatched((prev) => {
      const s = new Set(prev)
      s.delete(category)
      return s
    })
  }

  function handleAddAsCategory(row: ExcelRow) {
    const name = row.description || row.taskId
    const base = resolveActiveMapping(localMapping, savedCategoryMapping)
    const newMapping = { ...base, [name]: row.taskId }
    saveMutation.mutate({ mapping: newMapping, newCustomCategories: [name] })
  }

  function handleSave() {
    if (!localMapping) return
    saveMutation.mutate({ mapping: localMapping, newCustomCategories: [] })
  }

  const isDirty = localMapping !== null
  const notReadyHint = resolveNotReadyHint(sharepointUrl, localExcelFile)
  const showNotReadyHint = !isReady
  const loadButtonLabel = loadingRows ? 'Loading…' : 'Load from Excel'
  const savedMappingCount = Object.keys(savedCategoryMapping).length
  const showMappedHint = excelRows.length === 0 && savedMappingCount > 0

  return (
    <section aria-label="Excel category mapping" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category → Excel Mapping</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Map each app category to the corresponding Task ID row in your Excel sheet.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => void handleLoadRows()}
          disabled={!isReady || loadingRows}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
          aria-label="Load rows from Excel sheet"
        >
          {loadButtonLabel}
        </button>
        {showNotReadyHint && <span className="text-xs text-gray-400 dark:text-gray-500">{notReadyHint}</span>}
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600">
          {loadError}
        </p>
      )}

      {excelRows.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {allCategories.map((category) => (
              <MappingRow
                key={category}
                category={category}
                isFixed={defaultCategorySet.has(category)}
                currentTaskId={activeMapping[category] ?? ''}
                isAutoMatched={autoMatched.has(category)}
                excelRows={excelRows}
                onClearAutoMatch={handleClearAutoMatch}
                onMappingChange={handleMappingChange}
              />
            ))}
          </ul>

          <UnmappedRowsSection unmappedRows={unmappedRows} onAddAsCategory={handleAddAsCategory} />

          <MappingSaveRow
            isDirty={isDirty}
            isPending={saveMutation.isPending}
            isSuccess={saveMutation.isSuccess}
            isError={saveMutation.isError}
            onSave={handleSave}
          />
        </>
      )}

      {showMappedHint && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {savedMappingCount} categories mapped. Load from Excel to edit.
        </p>
      )}
    </section>
  )
}
