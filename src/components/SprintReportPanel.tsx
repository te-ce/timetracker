export type ExportStatus = 'pending' | 'exported'

interface Props {
  hoursPerCategory: Record<string, number>
  allCategories: string[]
  exportStatus: ExportStatus
  onMarkExported?: () => void
}

export function SprintReportPanel({ hoursPerCategory, allCategories, exportStatus, onMarkExported }: Props) {
  const total = allCategories.reduce((sum, cat) => sum + (hoursPerCategory[cat] ?? 0), 0)

  return (
    <section aria-label="Sprint report" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sprint Report</h3>
        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${
          exportStatus === 'exported' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {exportStatus === 'exported' ? 'Exported' : 'Pending'}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {allCategories.map((category) => {
          const hours = hoursPerCategory[category] ?? 0
          return (
            <li
              key={category}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5 shadow-sm"
            >
              <span className="text-sm font-medium">{category}</span>
              <span className={`font-mono text-sm font-bold ${hours === 0 ? 'text-gray-300' : ''}`}>
                {hours}h
              </span>
            </li>
          )
        })}
      </ul>

      <div className="rounded-lg border bg-indigo-50 px-4 py-3 text-right text-sm font-semibold">
        Total: {total}h
      </div>

      {exportStatus === 'pending' && onMarkExported && (
        <button
          onClick={onMarkExported}
          className="self-end rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Mark as Exported
        </button>
      )}
    </section>
  )
}
