import { useState } from 'react'
import { getSprintBoundaries, getSprintForDate, aggregateSprintHours } from '../domain/sprint'
import type { SprintConfig } from '../domain/sprint'
import { SprintReportPanel } from '../components/SprintReportPanel'
import type { ExportStatus } from '../components/SprintReportPanel'
import type { TimeEntry } from '../repositories/types'

// TODO: load from ConfigRepository
const DEFAULT_CONFIG: SprintConfig = { startDate: '2024-01-01', lengthDays: 14 }

export function SprintView() {
  const today = new Date().toISOString().slice(0, 10)
  const currentSprint = getSprintForDate(today, DEFAULT_CONFIG)
  const [sprintIndex, setSprintIndex] = useState(currentSprint.index)

  const sprint = getSprintBoundaries(sprintIndex, DEFAULT_CONFIG)

  // TODO: load from TimeEntryRepository via useQuery
  const entries: TimeEntry[] = []
  const hoursPerCategory = aggregateSprintHours(entries, sprint)

  // TODO: load from Firestore
  const exportStatus: ExportStatus = 'pending'

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

      <SprintReportPanel hoursPerCategory={hoursPerCategory} exportStatus={exportStatus} />
    </div>
  )
}
