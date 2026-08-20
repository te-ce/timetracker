export function HeadlineCard({
  label,
  value,
  detail,
  valueClass,
}: {
  label: string
  value: string
  detail?: string | undefined
  valueClass?: string | undefined
}) {
  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueClass ?? ''}`}>{value}</p>
      {detail && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
    </div>
  )
}

/** "Usually 08:05 → 16:15" — the average tracked day's start and end. */
