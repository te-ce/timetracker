import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { buildWorkbookService } from '../excel/workbookFactory'
import { useAuthStore } from '../../shared/authStore'
import { SheetSelectorBody } from './SheetSelectorBody'

interface Props {
  repository: ConfigRepository
}

function getNotReadyHint(sharepointUrl: string | undefined): string {
  if (!sharepointUrl) return 'Enter a SharePoint URL first'
  return 'Sign in to load sheets'
}

export function SheetSelector({ repository }: Props) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })

  const [sheets, setSheets] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingSheets, setLoadingSheets] = useState(false)

  const sharepointUrl = config?.sharepointUrl

  async function handleLoadSheets() {
    const workbook = config && buildWorkbookService(config, isAuthenticated)
    if (!workbook) return
    setLoadError(null)
    setLoadingSheets(true)
    try {
      const result = await workbook.listSheets()
      setSheets(result)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load sheets')
    } finally {
      setLoadingSheets(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (sheet: string) => {
      const current = await repository.get()
      await repository.save({ ...current, targetSheet: sheet || null })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const isReady = !!sharepointUrl && isAuthenticated
  const currentSheet = config.targetSheet ?? ''

  return (
    <section aria-label="Target sheet settings" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Target Sheet</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">Select the worksheet tab to write sprint data into.</p>
      <SheetSelectorBody
        isReady={isReady}
        loadingSheets={loadingSheets}
        sheets={sheets}
        currentSheet={currentSheet}
        loadError={loadError}
        showSaveError={saveMutation.isError}
        onLoadSheets={() => void handleLoadSheets()}
        onSelectSheet={(sheet) => saveMutation.mutate(sheet)}
        notReadyHint={getNotReadyHint(sharepointUrl ?? undefined)}
      />
    </section>
  )
}
