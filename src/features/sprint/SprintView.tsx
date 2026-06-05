import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours } from './sprint'
import type { SprintConfig, Sprint } from './sprint'
import { SprintReportPanel } from './SprintReportPanel'
import { SprintConfigPanel } from './SprintConfigPanel'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { getAllCategories } from '../../shared/categories'
import { useAuthStore } from '../../shared/authStore'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import { createWorkbookService, isExportReady } from '../excel/workbookFactory'
import { toLocalIso } from '../../shared/dateUtils'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

interface SprintState {
  sprintConfig: SprintConfig
  sprint: Sprint
}

function resolveSprintState(
  config: AppConfig | undefined,
  sprintIndex: number | null,
  today: string,
): SprintState | null {
  const startDate = config?.sprintStartDate ?? `${new Date(today).getUTCFullYear()}-01-01`
  const sprintConfig: SprintConfig = {
    startDate,
    lengthDays: config?.sprintLengthDays ?? DEFAULT_APP_CONFIG.sprintLengthDays,
  }
  const currentIndex = getSprintForDate(today, sprintConfig).index
  const activeIndex = sprintIndex !== null ? sprintIndex : currentIndex
  return { sprintConfig, sprint: getSprintBoundaries(activeIndex, sprintConfig) }
}

interface SprintContentProps {
  config: AppConfig
  sprintConfig: SprintConfig
  sprintIndex: number | null
  onSprintIndexChange: (index: number | null) => void
  sprint: Sprint
  isAuthenticated: boolean
}

function SprintContent({
  config,
  sprintConfig,
  sprintIndex,
  onSprintIndexChange,
  sprint,
  isAuthenticated,
}: SprintContentProps) {
  const { monthRepo, sprintExportRepo } = useRepositories()
  const queryClient = useQueryClient()
  const activeIndex = sprint.index

  const { data: entries = [] } = useQuery({
    queryKey: QUERY_KEYS.sprintEntries(activeIndex, sprintConfig.startDate, sprintConfig.lengthDays),
    queryFn: () => monthRepo.findEntriesByDateRange(sprint.start, sprint.end),
  })

  const hoursPerCategory = aggregateSprintHours(entries, sprint)
  const allCategories = getAllCategories(config.customCategories, config.categoryOrder)

  const { data: sprintExport } = useQuery({
    queryKey: QUERY_KEYS.sprintExportByIndex(activeIndex),
    queryFn: () => sprintExportRepo.findBySprintIndex(activeIndex),
  })

  const markExportedMutation = useMutation({
    mutationFn: () =>
      sprintExportRepo.save({
        sprintIndex: activeIndex,
        status: 'exported',
        exportedAt: toLocalIso(new Date()),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.sprintExportByIndex(activeIndex),
      }),
  })

  const exportStatus = sprintExport ? sprintExport.status : 'pending'
  const exportReady = isExportReady(config, isAuthenticated)

  async function handleExport(): Promise<void> {
    if (!config.targetSheet) throw new Error('No target sheet selected.')
    const service = createWorkbookService(config, isAuthenticated)
    await service.writeSprintData(config.targetSheet, config.categoryMapping ?? {}, hoursPerCategory)
    await markExportedMutation.mutateAsync()
  }

  return (
    <>
      <div className="flex items-center">
        <button
          onClick={() => onSprintIndexChange(activeIndex - 1)}
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
            onClick={() => onSprintIndexChange(null)}
            className={`rounded border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${sprintIndex === null ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
            aria-disabled={sprintIndex === null}
          >
            Current
          </button>
        </div>
        <button
          onClick={() => onSprintIndexChange(activeIndex + 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          Next →
        </button>
      </div>
      <SprintReportPanel
        hoursPerCategory={hoursPerCategory}
        allCategories={allCategories}
        exportStatus={exportStatus}
        exportReady={exportReady}
        onExport={handleExport}
      />
    </>
  )
}

export function SprintView() {
  const { configRepo } = useRepositories()
  const queryClient = useQueryClient()
  const [sprintIndex, setSprintIndex] = useState<number | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const sprintState = resolveSprintState(config, sprintIndex, toLocalIso(new Date()))

  return (
    <div className="flex flex-col gap-6">
      {sprintState && config && (
        <SprintContent
          config={config}
          sprintConfig={sprintState.sprintConfig}
          sprintIndex={sprintIndex}
          onSprintIndexChange={setSprintIndex}
          sprint={sprintState.sprint}
          isAuthenticated={isAuthenticated}
        />
      )}
      <SprintConfigPanel
        repository={configRepo}
        onConfigChanged={() => {
          invalidateConfig(queryClient)
          setSprintIndex(null)
        }}
      />
    </div>
  )
}
