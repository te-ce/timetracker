import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository } from '../repositories/types'
import type { ExcelRow } from '../services/excelService'
import { listRows } from '../services/excelService'
import { listLocalRows } from '../services/localExcelService'
import { getAllCategories } from '../domain/categories'
import { DEFAULT_CATEGORIES } from '../repositories/types'
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

export function ExcelMappingSettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })

  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingRows, setLoadingRows] = useState(false)
  const [localMapping, setLocalMapping] = useState<Record<string, string> | null>(null)
  const [autoMatched, setAutoMatched] = useState<Set<string>>(new Set())

  const sharepointUrl = config?.sharepointUrl
  const targetSheet = config?.targetSheet
  const localExcelFile = config?.localExcelFile
  const isReady = localFolder
    ? !!localExcelFile && !!targetSheet
    : !!sharepointUrl && !!targetSheet && isAuthenticated

  async function handleLoadRows() {
    setLoadError(null)
    setLoadingRows(true)
    try {
      let rows: ExcelRow[]
      if (localFolder) {
        if (!localExcelFile || !targetSheet) return
        rows = await listLocalRows(localExcelFile, targetSheet)
      } else {
        if (!sharepointUrl || !targetSheet || !isAuthenticated) return
        const token = await getAccessToken()
        rows = await listRows(sharepointUrl, targetSheet, token)
      }
      setExcelRows(rows)
      const saved = config.categoryMapping ?? {}
      const allCats = getAllCategories(config.customCategories, config.categoryOrder)
      const merged = autoMatchCategories(allCats, rows, saved)
      const newAutoMatched = new Set(
        Object.keys(merged).filter((k) => !saved[k] && merged[k]),
      )
      setAutoMatched(newAutoMatched)
      setLocalMapping(merged)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load rows')
    } finally {
      setLoadingRows(false)
    }
  }

  const saveMutation = useMutation({
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
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
    },
  })

  if (!config) return null

  const allCategories = getAllCategories(config.customCategories, config.categoryOrder)
  const activeMapping = localMapping ?? config.categoryMapping ?? {}
  const defaultCategorySet = new Set<string>(DEFAULT_CATEGORIES)

  // Rows from Excel that haven't been mapped to any existing category yet
  const mappedTaskIds = new Set(Object.values(activeMapping))
  const unmappedRows = excelRows.filter((r) => !mappedTaskIds.has(r.taskId))

  function handleMappingChange(category: string, taskId: string) {
    setLocalMapping((prev) => ({
      ...(prev ?? config?.categoryMapping ?? {}),
      [category]: taskId,
    }))
  }

  function handleAddAsCategory(row: ExcelRow) {
    const name = row.description || row.taskId
    setLocalMapping((prev) => {
      const m = { ...(prev ?? config?.categoryMapping ?? {}) }
      m[name] = row.taskId
      return m
    })
    // Immediately save with the new custom category
    const current = config?.categoryMapping ?? {}
    const newMapping = { ...current, [name]: row.taskId }
    saveMutation.mutate({ mapping: newMapping, newCustomCategories: [name] })
  }

  function handleSave() {
    if (!localMapping) return
    saveMutation.mutate({ mapping: localMapping, newCustomCategories: [] })
  }

  const isDirty = localMapping !== null

  return (
    <section aria-label="Excel category mapping" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-700">Category → Excel Mapping</h3>
        <p className="text-xs text-gray-500">
          Map each app category to the corresponding Task ID row in your Excel sheet.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => void handleLoadRows()}
          disabled={!isReady || loadingRows}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          aria-label="Load rows from Excel sheet"
        >
          {loadingRows ? 'Loading…' : 'Load from Excel'}
        </button>
        {!isReady && (
          <span className="text-xs text-gray-400">
            {localFolder
              ? (!localExcelFile ? 'Select an Excel file first' : 'Select a target sheet first')
              : (!sharepointUrl ? 'Set a SharePoint URL first' : 'Select a target sheet first')}
          </span>
        )}
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600">{loadError}</p>
      )}

      {excelRows.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {allCategories.map((category) => {
              const isFixed = defaultCategorySet.has(category)
              const currentTaskId = activeMapping[category] ?? ''
              return (
                <li key={category} className="flex items-center gap-3">
                  <span
                    className={`w-40 truncate text-sm font-medium ${isFixed ? '' : 'text-indigo-700'}`}
                    title={category}
                  >
                    {category}
                    {!isFixed && <span className="ml-1 text-xs text-gray-400">(custom)</span>}
                  </span>
                  <div className="relative flex flex-1 items-center gap-1">
                  {autoMatched.has(category) && (
                    <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-700" title="Auto-matched by name — please verify">
                      auto
                    </span>
                  )}
                  <select
                    aria-label={`Map ${category} to Task ID`}
                    value={currentTaskId}
                    onChange={(e) => {
                      setAutoMatched((prev) => { const s = new Set(prev); s.delete(category); return s })
                      handleMappingChange(category, e.target.value)
                    }}
                    className="flex-1 rounded border px-2 py-1 text-sm"
                  >
                    <option value="">— skip —</option>
                    {excelRows.map((row) => (
                      <option key={row.taskId} value={row.taskId}>
                        {row.taskId}{row.description ? ` — ${row.description}` : ''}
                      </option>
                    ))}
                  </select>
                  </div>
                </li>
              )
            })}
          </ul>

          {unmappedRows.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-medium text-indigo-700">
                Investment rows — not yet mapped to any category:
              </p>
              <ul className="flex flex-col gap-1">
                {unmappedRows.map((row) => (
                  <li key={row.taskId} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-700">
                      <span className="font-mono">{row.taskId}</span>
                      {row.description ? ` — ${row.description}` : ''}
                    </span>
                    <button
                      onClick={() => handleAddAsCategory(row)}
                      className="rounded border border-indigo-300 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100"
                    >
                      + Add as category
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Save mapping
              </button>
            )}
            {saveMutation.isSuccess && !isDirty && (
              <span className="text-xs text-green-700">✓ Mapping saved</span>
            )}
            {saveMutation.isError && (
              <p role="alert" className="text-xs text-red-600">Failed to save mapping.</p>
            )}
          </div>
        </>
      )}

      {excelRows.length === 0 && Object.keys(config.categoryMapping ?? {}).length > 0 && (
        <p className="text-xs text-gray-500">
          {Object.keys(config.categoryMapping!).length} categories mapped.{' '}
          Load from Excel to edit.
        </p>
      )}
    </section>
  )
}
