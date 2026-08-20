export function StatCard({
  label,
  value,
  highlight,
  positive,
}: {
  label: string
  value: string
  highlight?: boolean
  positive?: boolean
}) {
  const colorClass = highlight
    ? positive
      ? 'border-green-300 bg-green-50 dark:bg-emerald-900/30 dark:border-green-700'
      : 'border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
    : 'bg-white dark:bg-gray-800 dark:border-gray-700'
  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${colorClass}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
