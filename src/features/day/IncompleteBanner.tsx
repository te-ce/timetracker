interface Props {
  incompleteDates: string[]
  onNavigate: (date: string) => void
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function IncompleteBanner({ incompleteDates, onNavigate }: Props) {
  if (incompleteDates.length === 0) return null

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-4 py-3"
    >
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
        {incompleteDates.length} days need attention
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {incompleteDates.map((date) => (
          <li key={date}>
            <button
              onClick={() => onNavigate(date)}
              aria-label={`Go to ${new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
              className="rounded border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              {formatShortDate(date)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
