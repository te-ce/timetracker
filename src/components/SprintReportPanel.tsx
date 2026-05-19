import type { Category } from '../repositories/types'

export type ExportStatus = 'pending' | 'exported'

interface Props {
  hoursPerCategory: Partial<Record<Category, number>>
  exportStatus: ExportStatus
}

export function SprintReportPanel({ hoursPerCategory, exportStatus }: Props) {
  const entries = Object.entries(hoursPerCategory) as [Category, number][]
  const total = entries.reduce((sum, [, h]) => sum + h, 0)

  return (
    <section aria-label="Sprint report" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sprint Report</h3>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-medium ${
            exportStatus === 'exported'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {exportStatus === 'exported' ? 'Exported' : 'Pending'}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-gray-400">
          No time entries for this sprint
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {entries.map(([category, hours]) => (
              <li
                key={category}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5 shadow-sm"
              >
                <span className="text-sm font-medium">{category}</span>
                <span className="font-mono text-sm font-bold">{hours}h</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border bg-indigo-50 px-4 py-3 text-right text-sm font-semibold">
            Total: {total}h
          </div>
        </>
      )}
    </section>
  )
}
