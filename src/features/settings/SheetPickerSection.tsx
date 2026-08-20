interface SheetSelectorProps {
  sheets: string[]
  currentSheet: string
  loading: boolean
  onLoadSheets: () => void
  onSelectSheet: (sheet: string) => void
}

export function SheetPickerSection({ sheets, currentSheet, loading, onLoadSheets, onSelectSheet }: SheetSelectorProps) {
  const showSheetPicker = sheets.length > 0
  const showCurrentSheetHint = currentSheet !== '' && sheets.length === 0
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLoadSheets}
          disabled={loading}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Load sheets'}
        </button>
      </div>
      {showSheetPicker && (
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
    </div>
  )
}
