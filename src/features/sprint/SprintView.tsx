import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSprintBoundaries,
  getSprintForDate,
  aggregateSprintHours,
  roundHoursPerCategory,
  sprintExportStatus,
  resolveSprintConfig,
} from './sprint'
import type { SprintConfig, Sprint } from './sprint'
import { SprintConfigPanel } from './SprintConfigPanel'
import { SprintReportPanel } from './SprintReportPanel'
import { SprintNavigation } from './SprintNavigation'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { getAllCategories } from '../../shared/categories'
import { useAuthStore } from '../../shared/authStore'
import { QUERY_KEYS, invalidateConfig, invalidateSprintExport } from '../../shared/queryKeys'
import { createWorkbookService, isExportReady } from '../excel/workbookFactory'
import { exportBlockedReason, buildUnmappedItems } from './sprintExportState'
import { toLocalIso } from '../../shared/dateUtils'
import { buildArchiveSheetName } from './sprintSheetName'
import { resolveAppConfig } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

interface SprintState {
  sprintConfig: SprintConfig
  sprint: Sprint
}

function resolveSprintState(config: AppConfig | undefined, sprintIndex: number | null, today: string): SprintState {
  const sprintConfig = resolveSprintConfig(config)
  const activeIndex = sprintIndex !== null ? sprintIndex : getSprintForDate(today, sprintConfig).index
  return { sprintConfig, sprint: getSprintBoundaries(activeIndex, sprintConfig) }
}

interface Props {
  createService?: typeof createWorkbookService
}

export function SprintView({ createService = createWorkbookService }: Props) {
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
  const { weekdayHours, sprintRoundingStep, sprintRoundingMode } = resolveAppConfig(config)

  const { data: entries, status: entriesStatus } = useQuery({
    queryKey: QUERY_KEYS.sprintEntries(activeIndex, sprintConfig.startDate, sprintConfig.lengthDays, weekdayHours),
    queryFn: () => monthRepo.findEntriesByDateRange(sprint.start, sprint.end, weekdayHours),
    enabled: !!config,
  })

  const hoursPerCategory = roundHoursPerCategory(
    aggregateSprintHours(entries ?? [], sprint),
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
        sprintStart: sprint.start,
        sprintEnd: sprint.end,
      }),
    onSuccess: () => invalidateSprintExport(queryClient, activeIndex),
  })

  const exportStatus = sprintExportStatus(sprintExport, sprint)

  async function handleExport(overwrite: boolean): Promise<void> {
    if (!config) return
    if (entries === undefined) throw new Error('Sprint hours are not loaded yet.')
    if (!config.targetSheet) throw new Error('No target sheet selected.')
    const service = createService(config, isAuthenticated)
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
        exportBlockedReason={exportBlockedReason(entriesStatus)}
        exportKey={`${sprint.index}:${sprint.start}:${sprint.end}`}
        unmappedHours={buildUnmappedItems(config, hoursPerCategory)}
        onExport={config ? handleExport : undefined}
      />
    </div>
  )
}
