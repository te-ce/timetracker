// PROTOTYPE — throwaway design-language exploration. Delete this whole directory once a
// direction is picked and folded into the real app; do not ship variants as-is.
import { useSearch } from '@tanstack/react-router'
import { PrototypeSwitcher, VARIANTS, type VariantKey } from './PrototypeSwitcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'

function isVariantKey(value: unknown): value is VariantKey {
  return typeof value === 'string' && VARIANTS.some((v) => v.key === value)
}

export function validatePrototypeSearch(search: Record<string, unknown>): { variant: VariantKey } {
  return { variant: isVariantKey(search.variant) ? search.variant : 'A' }
}

export function PrototypeRoute({ variant }: { variant: VariantKey }) {
  return (
    <div>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher current={variant} />
    </div>
  )
}

export function PrototypeRouteComponent() {
  const { variant } = useSearch({ from: '/prototype' })
  return <PrototypeRoute variant={variant} />
}
