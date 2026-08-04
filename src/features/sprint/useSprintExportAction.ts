import { useState } from 'react'
import { isSheetExistsError } from '../excel/workbookService'

export function useSprintExportAction(onExport?: (overwrite: boolean) => Promise<void>) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [needsOverwriteConfirm, setNeedsOverwriteConfirm] = useState(false)

  async function handleExport() {
    if (!onExport) return
    setExportError(null)
    setExporting(true)
    try {
      await onExport(needsOverwriteConfirm)
      setNeedsOverwriteConfirm(false)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
      setNeedsOverwriteConfirm(isSheetExistsError(err))
    } finally {
      setExporting(false)
    }
  }

  return { exporting, exportError, needsOverwriteConfirm, handleExport }
}
