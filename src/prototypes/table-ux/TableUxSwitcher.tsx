// PROTOTYPE — floating variant switcher for the table-UX exploration, dev-only.
import { useCallback, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

export const TABLE_VARIANTS = [
  { key: 'live', name: 'Current grid' },
  { key: 'D', name: 'Heat grid (all data)' },
  { key: 'E', name: 'Transposed matrix' },
  { key: 'F', name: 'Ledger + aligned charts' },
  { key: 'A', name: 'Balance ledger' },
  { key: 'B', name: 'Week bands' },
  { key: 'C', name: 'Rail + workspace' },
] as const

export type TableVariantKey = (typeof TABLE_VARIANTS)[number]['key']

export function isTableVariantKey(value: unknown): value is TableVariantKey {
  return typeof value === 'string' && TABLE_VARIANTS.some((v) => v.key === value)
}

export function TableUxSwitcher({ current }: { current: TableVariantKey }) {
  const navigate = useNavigate()
  const search = useSearch({ from: '/table' })

  const index = TABLE_VARIANTS.findIndex((v) => v.key === current)
  const currentDef = TABLE_VARIANTS[index] ?? TABLE_VARIANTS[0]

  const go = useCallback(
    (delta: number) => {
      const nextIndex = (index + delta + TABLE_VARIANTS.length) % TABLE_VARIANTS.length
      const nextKey = (TABLE_VARIANTS[nextIndex] ?? TABLE_VARIANTS[0]).key
      void navigate({ to: '/table', search: { ...search, tableVariant: nextKey } })
    },
    [index, navigate, search],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
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
        aria-label="Previous table variant"
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
        aria-label="Next table variant"
        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
      >
        →
      </button>
      <span className="ml-1 border-l border-white/10 pl-3 text-[10px] uppercase tracking-wide text-gray-400">
        prototype
      </span>
    </div>
  )
}
