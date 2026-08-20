export interface SheetSelectorBodyProps {
  isReady: boolean
  loadingSheets: boolean
  sheets: string[]
  currentSheet: string
  loadError: string | null
  showSaveError: boolean
  onLoadSheets: () => void
  onSelectSheet: (sheet: string) => void
  notReadyHint: string
}

export function SheetSelectorBody({
  isReady,
  loadingSheets,
  sheets,
  currentSheet,
  loadError,
  showSaveError,
  onLoadSheets,
  onSelectSheet,
  notReadyHint,
}: SheetSelectorBodyProps) {
  const showNotReadyHint = !isReady
  const showCurrentSheetHint = currentSheet !== '' && sheets.length === 0
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLoadSheets}
          disabled={!isReady || loadingSheets}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
          aria-label="Load sheets from workbook"
        >
          {loadingSheets ? 'Loading…' : 'Load sheets'}
        </button>
        {showNotReadyHint && <span className="text-xs text-gray-400 dark:text-gray-500">{notReadyHint}</span>}
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600">
          {loadError}
        </p>
      )}

      {sheets.length > 0 && (
        <select
          aria-label="Target sheet"
          value={currentSheet}
          onChange={(e) => onSelectSheet(e.target.value)}
          className="w-64 rounded border bg-transparent pl-3 pr-6 py-2 text-sm dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">— select a sheet —</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {showCurrentSheetHint && <p className="text-xs text-green-700 dark:text-emerald-400">✓ {currentSheet}</p>}

      {showSaveError && (
        <p role="alert" className="text-xs text-red-600">
          Failed to save sheet selection.
        </p>
      )}
    </>
  )
}
