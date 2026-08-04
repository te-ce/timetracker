import type { ConfigRepository } from '../../infra/repositories/types'
import { BUNDESLAENDER } from '../../shared/holidays'
import type { Bundesland } from '../../shared/holidays'
import { useConfigFieldMutation } from './useConfigFieldMutation'

interface Props {
  repository: ConfigRepository
}

export function BundeslandSettings({ repository }: Props) {
  const { config, mutation } = useConfigFieldMutation<Bundesland | null>(repository, (config, state) => ({
    ...config,
    federalState: state,
  }))

  if (!config) return null

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="bundesland-select" className="text-sm font-medium">
        Bundesland
      </label>
      <select
        id="bundesland-select"
        aria-label="Bundesland"
        value={config.federalState ?? ''}
        onChange={(e) => {
          const val = e.target.value
          const bundesland = BUNDESLAENDER.find((b) => b.code === val)
          mutation.mutate(bundesland?.code ?? null)
        }}
        className="w-64 rounded border bg-transparent pl-3 pr-6 py-2 text-sm dark:border-gray-600 dark:text-gray-100"
      >
        <option value="">None</option>
        {BUNDESLAENDER.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">Used to auto-detect public holidays for your state.</p>
    </div>
  )
}
