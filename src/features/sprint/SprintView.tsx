import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours, roundHoursPerCategory } from './sprint'
import type { SprintConfig, Sprint } from './sprint'
import { SprintConfigPanel } from './SprintConfigPanel'
import { SprintReportPanel } from './SprintReportPanel'
import { SprintNavigation } from './SprintNavigation'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { getAllCategories } from '../../shared/categories'
import { useAuthStore } from '../../shared/authStore'
import { QUERY_KEYS, invalidateConfig, invalidateSprintExport } from '../../shared/queryKeys'
import { createWorkbookService, isExportReady } from '../excel/workbookFactory'
import { toLocalIso } from '../../shared/dateUtils'
import { buildArchiveSheetName } from './sprintSheetName'
import { DEFAULT_APP_CONFIG, resolveAppConfig } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

interface SprintState {
  sprintConfig: SprintConfig
  sprint: Sprint
}

function resolveSprintState(config: AppConfig | undefined, sprintIndex: number | null, today: string): SprintState {
  const startDate = config?.sprintStartDate ?? `${new Date(today).getUTCFullYear()}-01-01`
  const sprintConfig: SprintConfig = {
    startDate,
    lengthDays: config?.sprintLengthDays ?? DEFAULT_APP_CONFIG.sprintLengthDays,
  }
  const currentIndex = getSprintForDate(today, sprintConfig).index
  const activeIndex = sprintIndex !== null ? sprintIndex : currentIndex
  return { sprintConfig, sprint: getSprintBoundaries(activeIndex, sprintConfig) }
}

export function SprintView() {
  const { configRepo, monthRepo, sprintExportRepo } = useRepositories()
  const queryClient = useQueryClient()
  const [sprintIndex, setSprintIndex] = useState<number | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const today = toLocalIso(new Date())

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { sprintConfig, sprint } = resolveSprintState(config, sprintIndex, today)
  const activeIndex = sprint.index

  const { data: entries = [] } = useQuery({
    queryKey: QUERY_KEYS.sprintEntries(activeIndex, sprintConfig.startDate, sprintConfig.lengthDays),
    queryFn: () =>
      monthRepo.findEntriesByDateRange(
        sprint.start,
        sprint.end,
        config?.weekdayHours ?? DEFAULT_APP_CONFIG.weekdayHours,
      ),
    enabled: !!config,
  })

  const { sprintRoundingStep, sprintRoundingMode } = resolveAppConfig(config)
  const hoursPerCategory = roundHoursPerCategory(
    aggregateSprintHours(entries, sprint),
    sprintRoundingStep,
    sprintRoundingMode,
  )
  const allCategories = config ? getAllCategories(config.customCategories, config.categoryOrder) : []

  const { data: sprintExport } = useQuery({
    queryKey: QUERY_KEYS.sprintExportByIndex(activeIndex),
    queryFn: () => sprintExportRepo.findBySprintIndex(activeIndex),
    enabled: !!config,
  })

  const markExportedMutation = useMutation({
    mutationFn: () =>
      sprintExportRepo.save({
        sprintIndex: activeIndex,
        status: 'exported',
        exportedAt: toLocalIso(new Date()),
      }),
    onSuccess: () => invalidateSprintExport(queryClient, activeIndex),
  })

  const exportStatus = sprintExport ? sprintExport.status : 'pending'

  async function handleExport(overwrite: boolean): Promise<void> {
    if (!config) return
    if (!config.targetSheet) throw new Error('No target sheet selected.')
    const service = createWorkbookService(config, isAuthenticated)
    const mapping = config.categoryMapping ?? {}
    await service.writeSprintData(config.targetSheet, mapping, hoursPerCategory)
    if (config.archiveSprintSheet) {
      const archiveName = buildArchiveSheetName(config.localExcelFile ?? null, sprint.start, sprint.end)
      await service.archiveSprintSheet(archiveName, mapping, hoursPerCategory, overwrite)
    }
    await markExportedMutation.mutateAsync()
  }

  return (
    <div className="flex flex-col gap-6">
      {config && (
        <>
          <SprintNavigation
            sprint={sprint}
            sprintIndex={sprintIndex}
            onSprintIndexChange={setSprintIndex}
            today={today}
          />
          <SprintReportPanel
            hoursPerCategory={hoursPerCategory}
            allCategories={allCategories}
            categoryDescriptions={config.categoryDescriptions}
            preferCategoryDescriptionAsPrimary={config.preferCategoryDescriptionAsPrimary}
          />
        </>
      )}
      <SprintConfigPanel
        repository={configRepo}
        onConfigChanged={() => {
          invalidateConfig(queryClient)
          setSprintIndex(null)
        }}
        exportStatus={config ? exportStatus : undefined}
        exportReady={config ? isExportReady(config, isAuthenticated) : undefined}
        onExport={config ? handleExport : undefined}
      />
    </div>
  )
}
