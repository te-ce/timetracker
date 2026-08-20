import type { ExcelRow } from '../excel/workbookService'

export interface UnmappedCategoryRowsSectionProps {
  unmappedRows: ExcelRow[]
  onAddAsCategory: (row: ExcelRow) => void
}

export function UnmappedCategoryRowsSection({ unmappedRows, onAddAsCategory }: UnmappedCategoryRowsSectionProps) {
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
