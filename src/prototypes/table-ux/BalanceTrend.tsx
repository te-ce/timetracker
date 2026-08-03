// PROTOTYPE — inline SVG running-balance trend. Delete with the directory.
import type { ProtoDay } from './protoRows'

interface Props {
  days: ProtoDay[]
  height?: number
  showZero?: boolean
}

export function BalanceTrend({ days, height = 56, showZero = true }: Props) {
  const points = days.filter((d) => d.cumulative !== null).map((d) => ({ date: d.date, value: d.cumulative ?? 0 }))
  if (points.length < 2) {
    return <div className="text-xs text-gray-400 dark:text-gray-500">Not enough tracked days for a trend yet.</div>
  }
  const values = points.map((p) => p.value)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const width = 100
  const x = (i: number) => (i / (points.length - 1)) * width
  const y = (v: number) => height - ((v - min) / span) * height
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ')
  const area = `${line} L${width},${y(0).toFixed(2)} L0,${y(0).toFixed(2)} Z`
  const last = points[points.length - 1]
  const positive = (last?.value ?? 0) >= 0

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
      role="img"
      aria-label="Running over/undertime balance across the month"
    >
      <path d={area} className={positive ? 'fill-emerald-500/15' : 'fill-red-500/15'} />
      <path
        d={line}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={positive ? 'stroke-emerald-500' : 'stroke-red-500'}
      />
      {showZero && (
        <line
          x1={0}
          x2={width}
          y1={y(0)}
          y2={y(0)}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          className="stroke-gray-400/60"
        />
      )}
    </svg>
  )
}
