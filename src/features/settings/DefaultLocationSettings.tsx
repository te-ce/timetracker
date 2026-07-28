import type { ConfigRepository, WorkLocation } from '../../infra/repositories/types'
import { useConfigFieldMutation } from './useConfigFieldMutation'

interface Props {
  repository: ConfigRepository
}

export function DefaultLocationSettings({ repository }: Props) {
  const { config, mutation } = useConfigFieldMutation<WorkLocation>(repository, (config, loc) => ({
    ...config,
    defaultWorkLocation: loc,
  }))

  if (!config) return null

  const WORK_LOCATIONS: WorkLocation[] = ['Remote', 'Office']

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="default-location-select" className="text-sm font-medium">
        Default Work Location
      </label>
      <div className="flex gap-2">
        {WORK_LOCATIONS.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => mutation.mutate(loc)}
            className={`rounded border px-4 py-1.5 text-sm transition-colors ${
              (config.defaultWorkLocation ?? 'Remote') === loc
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                : 'text-gray-600 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {loc === 'Office' ? '🏢 Office' : '🏠 Remote'}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Used as the default location for days with no explicit override.
      </p>
    </div>
  )
}
