interface Props {
  incompleteDates: string[]
  onNavigate: (date: string) => void
}

export function IncompleteBanner({ incompleteDates, onNavigate }: Props) {
  if (incompleteDates.length === 0) return null

  return (
    <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-800">
        {incompleteDates.length} days need attention
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {incompleteDates.map((date) => (
          <li key={date}>
            <button
              onClick={() => onNavigate(date)}
              className="rounded border border-amber-200 bg-white px-2 py-0.5 text-xs hover:bg-amber-100"
            >
              {date}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
