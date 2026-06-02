import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours } from '../domain/sprint'
import type { SprintConfig } from '../domain/sprint'
import { SprintReportPanel } from '../components/SprintReportPanel'
import { SprintConfigPanel } from '../components/SprintConfigPanel'
import { useRepositories } from '../repositories/RepositoryContext'
import { getAllCategories } from '../domain/categories'
import { GraphApiWorkbookService, LocalFolderWorkbookService } from '../services/workbookService'
import { useAuthStore } from '../stores/authStore'
import { getAccessToken } from '../auth/msalInstance'
import { isLocalFolderMode } from '../auth/bootstrapConfig'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { AppConfig } from '../repositories/types'
import type { WorkbookService } from '../services/workbookService'

const localFolder = isLocalFolderMode()

function hasCategoryMappings(config: AppConfig | undefined): boolean {
  const mapping = config ? config.categoryMapping : undefined
  return Object.keys(mapping ?? {}).length > 0
}

function isLocalFolderExportReady(config: AppConfig | undefined): boolean {
  if (!config) return false
  return !!config.localExcelFile && !!config.targetSheet && hasCategoryMappings(config)
}

function isCloudExportReady(config: AppConfig | undefined, isAuthenticated: boolean): boolean {
  if (!config) return false
  return !!config.sharepointUrl && !!config.targetSheet && hasCategoryMappings(config) && isAuthenticated
}

function isExportReady(config: AppConfig | undefined, isAuthenticated: boolean): boolean {
  return localFolder ? isLocalFolderExportReady(config) : isCloudExportReady(config, isAuthenticated)
}

function buildExportService(config: AppConfig, isAuthenticated: boolean): WorkbookService {
  if (localFolder) {
    if (!config.localExcelFile) throw new Error('No local Excel file selected.')
    return new LocalFolderWorkbookService(config.localExcelFile)
  }
  if (!config.sharepointUrl || !isAuthenticated) throw new Error('SharePoint URL or auth missing.')
  return new GraphApiWorkbookService(config.sharepointUrl, getAccessToken)
}

export function SprintView() {
  const { configRepo, monthRepo, sprintExportRepo } = useRepositories()
  const queryClient = useQueryClient()
  const [sprintIndex, setSprintIndex] = useState<number | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const sprintConfig: SprintConfig = {
    startDate: config ? (config.sprintStartDate ?? '2024-01-01') : '2024-01-01',
    lengthDays: config ? config.sprintLengthDays : 14,
  }

  const today = new Date().toISOString().slice(0, 10)
  const currentSprint = getSprintForDate(today, sprintConfig)
  const activeIndex = sprintIndex !== null ? sprintIndex : currentSprint.index

  const sprint = getSprintBoundaries(activeIndex, sprintConfig)

  const { data: entries = [] } = useQuery({
    queryKey: QUERY_KEYS.sprintEntries(activeIndex, sprintConfig.startDate, sprintConfig.lengthDays),
    queryFn: () => monthRepo.findEntriesByDateRange(sprint.start, sprint.end),
  })

  const hoursPerCategory = aggregateSprintHours(entries, sprint)
  const customCategories = config ? config.customCategories : []
  const allCategories = getAllCategories(customCategories, config?.categoryOrder)

  const { data: sprintExport } = useQuery({
    queryKey: QUERY_KEYS.sprintExportByIndex(activeIndex),
    queryFn: () => sprintExportRepo.findBySprintIndex(activeIndex),
  })

  const markExportedMutation = useMutation({
    mutationFn: () =>
      sprintExportRepo.save({
        sprintIndex: activeIndex,
        status: 'exported',
        exportedAt: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.sprintExportByIndex(activeIndex),
      }),
  })

  const exportStatus = sprintExport ? sprintExport.status : 'pending'
  const exportReady = isExportReady(config, isAuthenticated)

  async function handleExport(): Promise<void> {
    if (!config?.targetSheet) throw new Error('No target sheet selected.')
    const service = buildExportService(config, isAuthenticated)
    await service.writeSprintData(config.targetSheet, config.categoryMapping ?? {}, hoursPerCategory)
    await markExportedMutation.mutateAsync()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <button
          onClick={() => setSprintIndex(activeIndex - 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          ← Prev
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <h2 className="text-lg font-semibold">
            Sprint {sprint.index + 1}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              {sprint.start} → {sprint.end}
            </span>
          </h2>
          <button
            onClick={() => setSprintIndex(null)}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${sprintIndex === null ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
            aria-disabled={sprintIndex === null}
          >
            Current
          </button>
        </div>
        <button
          onClick={() => setSprintIndex(activeIndex + 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          Next →
        </button>
      </div>
      <SprintConfigPanel
        repository={configRepo}
        onConfigChanged={() => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })
          setSprintIndex(null)
        }}
      />
      <SprintReportPanel
        hoursPerCategory={hoursPerCategory}
        allCategories={allCategories}
        exportStatus={exportStatus}
        exportReady={exportReady}
        onExport={handleExport}
      />
    </div>
  )
}
