export interface StatBarRow {
  key: string
  label: string
  value: string
  /** Bar width as a share of the row with the highest value, 0–100. */
  fillPercent: number
  muted?: boolean
}

interface Props {
  title: string
  rows: StatBarRow[]
  emptyMessage: string
}

export function StatBarList({ title, rows, emptyMessage }: Props) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
      data-testid={`stat-bars-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-2">
              <span className={`truncate text-xs ${row.muted ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                {row.label}
              </span>
              <span className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                <span
                  className="block h-2 rounded-full bg-indigo-500"
                  style={{ width: `${Math.max(0, Math.min(100, row.fillPercent))}%` }}
                  aria-hidden="true"
                />
              </span>
              <span className="text-right text-xs tabular-nums text-gray-600 dark:text-gray-300">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
