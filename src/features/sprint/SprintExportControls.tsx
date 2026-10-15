import { useSprintExportAction } from './useSprintExportAction'
import type { ExportStatus } from './sprint'

interface Props {
  exportStatus: ExportStatus | undefined
  exportReady: boolean | undefined
  onExport: (overwrite: boolean) => Promise<void>
}

export function SprintExportControls({ exportStatus, exportReady, onExport }: Props) {
  const { exporting, exportError, needsOverwriteConfirm, handleExport } = useSprintExportAction(onExport)

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span
          className={`h-2 w-2 rounded-full ${exportStatus === 'exported' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        />
        {exportStatus === 'exported' ? 'Exported' : 'Pending'}
      </span>
      {exportError && (
        <p role="alert" className="text-xs text-red-600">
          {exportError}
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting}
        className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        data-tooltip={
          !exportReady ? 'Configure SharePoint URL, sheet, and category mapping in Settings first' : undefined
        }
      >
        {exporting ? 'Exporting…' : needsOverwriteConfirm ? 'Export and overwrite' : 'Export'}
      </button>
    </div>
  )
}
