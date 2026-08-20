export interface FileSelectorProps {
  xlsxFiles: string[]
  currentFile: string
  loading: boolean
  onScanFiles: () => void
  onFileChange: (filename: string) => void
}

export function FileSelector({ xlsxFiles, currentFile, loading, onScanFiles, onFileChange }: FileSelectorProps) {
  const showFilePicker = xlsxFiles.length > 0
  const showCurrentFileHint = currentFile !== '' && xlsxFiles.length === 0
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onScanFiles}
          disabled={loading}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
        >
          {loading ? 'Scanning…' : 'Scan folder for .xlsx files'}
        </button>
      </div>
      {showFilePicker && (
        <select
          aria-label="Excel workbook file"
          value={currentFile}
          onChange={(e) => onFileChange(e.target.value)}
          className="w-64 rounded border bg-transparent pl-3 pr-6 py-2 text-sm dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">— select a file —</option>
          {xlsxFiles.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}
      {showCurrentFileHint && <p className="text-xs text-green-700 dark:text-emerald-400">✓ {currentFile}</p>}
    </div>
  )
}
