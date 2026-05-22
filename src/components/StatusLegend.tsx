const ITEMS = [
  { color: 'bg-emerald-600', label: 'Confirmed' },
  { color: 'bg-emerald-400', label: 'Tracked' },
  { color: 'bg-yellow-400', label: 'Needs review' },
  { color: 'bg-blue-300', label: 'Untracked' },
  { color: 'bg-purple-400', label: 'Leave' },
  { color: 'bg-gray-300', label: 'Non-working / future' },
]

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 text-xs text-gray-500 ${className ?? ''}`}>
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${item.color}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  )
}
