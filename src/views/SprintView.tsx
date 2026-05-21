import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours } from '../domain/sprint'
import type { SprintConfig } from '../domain/sprint'
import { SprintReportPanel } from '../components/SprintReportPanel'
import { SprintConfigPanel } from '../components/SprintConfigPanel'
import { sprintExportRepo, timeEntryRepo, configRepo } from '../repositories/shared'
import { getAllCategories } from '../domain/categories'

export function SprintView() {
  const queryClient = useQueryClient()
  const [sprintIndex, setSprintIndex] = useState<number | null>(null)

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  const sprintConfig: SprintConfig = {
    startDate: config?.sprintStartDate ?? '2024-01-01',
    lengthDays: config?.sprintLengthDays ?? 14,
  }

  const today = new Date().toISOString().slice(0, 10)
  const currentSprint = getSprintForDate(today, sprintConfig)
  const activeIndex = sprintIndex ?? currentSprint.index

  const sprint = getSprintBoundaries(activeIndex, sprintConfig)

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', 'sprint', activeIndex, sprintConfig.startDate, sprintConfig.lengthDays],
    queryFn: () => timeEntryRepo.findByDateRange(new Date(sprint.start), new Date(sprint.end)),
  })

  const hoursPerCategory = aggregateSprintHours(entries, sprint)
  const allCategories = getAllCategories(config?.customCategories ?? [], config?.categoryOrder)

  const { data: sprintExport } = useQuery({
    queryKey: ['sprintExport', activeIndex],
    queryFn: () => sprintExportRepo.findBySprintIndex(activeIndex),
  })

  const markExportedMutation = useMutation({
    mutationFn: () =>
      sprintExportRepo.save({
        sprintIndex: activeIndex,
        status: 'exported',
        exportedAt: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sprintExport', activeIndex] }),
  })

  const exportStatus = sprintExport?.status ?? 'pending'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <button
          onClick={() => setSprintIndex(activeIndex - 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
        >
          ← Prev
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <h2 className="text-lg font-semibold">
            Sprint {sprint.index + 1}
            <span className="ml-2 text-sm font-normal text-gray-500">{sprint.start} → {sprint.end}</span>
          </h2>
          <button
            onClick={() => setSprintIndex(null)}
            className="rounded border px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Current
          </button>
        </div>
        <button
          onClick={() => setSprintIndex(activeIndex + 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
        >
          Next →
        </button>
      </div>

      <SprintReportPanel
        hoursPerCategory={hoursPerCategory}
        allCategories={allCategories}
        exportStatus={exportStatus}
        onMarkExported={() => markExportedMutation.mutate()}
      />

      <SprintConfigPanel
        repository={configRepo}
        onConfigChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['config'] })
          setSprintIndex(null)
        }}
      />
    </div>
  )
}
