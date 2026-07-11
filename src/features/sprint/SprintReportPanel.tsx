import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { isSheetExistsError } from '../excel'

export type ExportStatus = 'pending' | 'exported'

interface Props {
  hoursPerCategory: Record<string, number>
  allCategories: string[]
  exportStatus: ExportStatus
  exportReady?: boolean
  onExport?: (overwrite: boolean) => Promise<void>
}

function exportBadgeClassName(status: ExportStatus): string {
  const base = 'rounded-full px-3 py-0.5 text-xs font-medium'
  if (status === 'exported') return `${base} bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400`
  return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`
}

export function SprintReportPanel({
  hoursPerCategory,
  allCategories,
  exportStatus,
  exportReady = false,
  onExport,
}: Props) {
  const total = allCategories.reduce((sum, cat) => sum + (hoursPerCategory[cat] ?? 0), 0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [needsOverwriteConfirm, setNeedsOverwriteConfirm] = useState(false)

  async function handleExport(overwrite: boolean) {
    if (!onExport) return
    setExportError(null)
    setExporting(true)
    try {
      await onExport(overwrite)
      setNeedsOverwriteConfirm(false)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
      setNeedsOverwriteConfirm(isSheetExistsError(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <section aria-label="Sprint report" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sprint Report</h3>
        <span className={exportBadgeClassName(exportStatus)}>
          {exportStatus === 'exported' ? 'Exported' : 'Pending'}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {allCategories.map((category) => {
          const hours = hoursPerCategory[category] ?? 0
          return (
            <li
              key={category}
              className="flex items-center justify-between rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 shadow-sm"
            >
              <span className="text-sm font-medium">{category}</span>
              <span className={`font-mono text-sm font-bold ${hours === 0 ? 'text-gray-300 dark:text-gray-600' : ''}`}>
                {formatHours(hours, 'decimal')}{' '}
                <span className="font-normal text-gray-400 dark:text-gray-500">· {formatHours(hours, 'hhmm')}</span>
              </span>
            </li>
          )
        })}
      </ul>

      <div className="rounded-lg border bg-indigo-50 dark:bg-indigo-900/40 dark:border-indigo-700 px-4 py-3 text-right text-sm font-semibold">
        Total: <span>{formatHours(total, 'decimal')}</span>{' '}
        <span className="font-normal text-gray-500 dark:text-gray-400">· {formatHours(total, 'hhmm')}</span>
      </div>

      {onExport && (
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => void handleExport(needsOverwriteConfirm)}
            disabled={exporting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            data-tooltip={
              !exportReady ? 'Configure SharePoint URL, sheet, and category mapping in Settings first' : undefined
            }
          >
            {exporting ? 'Exporting…' : needsOverwriteConfirm ? 'Export and overwrite' : 'Export'}
          </button>
          {!exportReady && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Complete SharePoint setup in Settings to enable export.
            </p>
          )}
          {exportError && (
            <p role="alert" className="text-xs text-red-600">
              {exportError}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
