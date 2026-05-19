import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours } from '../domain/sprint'
import type { SprintConfig } from '../domain/sprint'
import { SprintReportPanel } from '../components/SprintReportPanel'
import { InMemorySprintExportRepository, InMemoryTimeEntryRepository } from '../repositories/in-memory'

// TODO: load from ConfigRepository
const DEFAULT_CONFIG: SprintConfig = { startDate: '2024-01-01', lengthDays: 14 }

const sprintExportRepo = new InMemorySprintExportRepository()
const timeEntryRepo = new InMemoryTimeEntryRepository()

export function SprintView() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const currentSprint = getSprintForDate(today, DEFAULT_CONFIG)
  const [sprintIndex, setSprintIndex] = useState(currentSprint.index)

  const sprint = getSprintBoundaries(sprintIndex, DEFAULT_CONFIG)

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', 'sprint', sprintIndex],
    queryFn: () => timeEntryRepo.findByDateRange(new Date(sprint.start), new Date(sprint.end)),
  })

  const hoursPerCategory = aggregateSprintHours(entries, sprint)

  const { data: sprintExport } = useQuery({
    queryKey: ['sprintExport', sprintIndex],
    queryFn: () => sprintExportRepo.findBySprintIndex(sprintIndex),
  })

  const markExportedMutation = useMutation({
    mutationFn: () =>
      sprintExportRepo.save({
        sprintIndex,
        status: 'exported',
        exportedAt: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sprintExport', sprintIndex] }),
  })

  const exportStatus = sprintExport?.status ?? 'pending'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSprintIndex((i) => i - 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
        >
          ← Prev
        </button>
        <h2 className="text-lg font-semibold">
          Sprint {sprint.index + 1}
          <span className="ml-2 text-sm font-normal text-gray-500">
            {sprint.start} → {sprint.end}
          </span>
        </h2>
        <button
          onClick={() => setSprintIndex((i) => i + 1)}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
        >
          Next →
        </button>
      </div>

      <SprintReportPanel
        hoursPerCategory={hoursPerCategory}
        exportStatus={exportStatus}
        onMarkExported={() => markExportedMutation.mutate()}
      />
    </div>
  )
}
