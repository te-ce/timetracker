// PROTOTYPE — mounts one of four WorkPeriod-list / tracking UX variants in place
// of the real <WorkOverview> on the day route, gated by `?proto=`.
// Real repository, real data, real mutations — only the rendering differs.
import { TrackingSwitcher, type TrackingVariantKey } from './TrackingSwitcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantD } from './VariantD'
import { VariantE } from './VariantE'
import { withUncategorized, type VariantProps } from './protoShared'

interface Props extends VariantProps {
  variant: TrackingVariantKey
}

export function DayTrackingPrototype({ variant, ...rest }: Props) {
  const props = { ...rest, categories: withUncategorized(rest.categories) }
  return (
    <section aria-label="Work periods (prototype)">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
          prototype {variant}
        </span>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Work periods</h3>
      </div>
      {variant === 'A' && <VariantA {...props} />}
      {variant === 'B' && <VariantB {...props} />}
      {variant === 'D' && <VariantD {...props} />}
      {variant === 'E' && <VariantE {...props} />}
      <TrackingSwitcher current={variant} date={props.date} />
    </section>
  )
}
