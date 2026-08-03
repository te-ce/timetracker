// PROTOTYPE — floating variant switcher for the day-tracking UX prototype.
// Hidden in production builds.
import { useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

export const TRACKING_VARIANTS = [
  { key: 'A', name: 'Live Chronology' },
  { key: 'D', name: 'Editable Table' },
  { key: 'E', name: 'Segment Stream' },
] as const

export type TrackingVariantKey = (typeof TRACKING_VARIANTS)[number]['key']

export function isTrackingVariantKey(value: unknown): value is TrackingVariantKey {
  return typeof value === 'string' && TRACKING_VARIANTS.some((v) => v.key === value)
}

interface Props {
  current: TrackingVariantKey
  date: string
}

export function TrackingSwitcher({ current, date }: Props) {
  const navigate = useNavigate()

  const index = TRACKING_VARIANTS.findIndex((v) => v.key === current)
  const currentDef = TRACKING_VARIANTS[index] ?? TRACKING_VARIANTS[0]

  const go = useCallback(
    (delta: number) => {
      const nextIndex = (index + delta + TRACKING_VARIANTS.length) % TRACKING_VARIANTS.length
      const nextKey = (TRACKING_VARIANTS[nextIndex] ?? TRACKING_VARIANTS[0]).key
      void navigate({ to: '/', search: { date, proto: nextKey } })
    },
    [date, index, navigate],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [go])

  if (import.meta.env.PROD) return null

  return (
    <div className="fixed bottom-5 left-1/2 z-[999] flex -translate-x-1/2 items-center gap-3 rounded-full border border-fuchsia-400/40 bg-gray-900/95 px-2 py-1.5 text-white shadow-2xl shadow-fuchsia-500/20 backdrop-blur">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
      >
        ←
      </button>
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="rounded-full bg-fuchsia-500/20 px-2 py-0.5 font-mono text-fuchsia-300">{currentDef.key}</span>
        <span>{currentDef.name}</span>
      </div>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next variant"
        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
      >
        →
      </button>
      <button
        type="button"
        onClick={() => void navigate({ to: '/', search: { date } })}
        className="ml-1 border-l border-white/10 pl-3 text-[10px] uppercase tracking-wide text-gray-400 hover:text-white"
      >
        exit proto
      </button>
    </div>
  )
}
