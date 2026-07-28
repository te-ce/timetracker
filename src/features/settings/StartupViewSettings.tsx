import type { ConfigRepository, StartupView } from '../../infra/repositories/types'
import { useConfigFieldMutation } from './useConfigFieldMutation'

interface Props {
  repository: ConfigRepository
}

const OPTIONS: { value: StartupView; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'month', label: 'Month' },
  { value: 'table', label: 'Timesheet' },
  { value: 'table-with-log', label: "Timesheet + today's log" },
  { value: 'last', label: 'Resume last view' },
]

export function StartupViewSettings({ repository }: Props) {
  const { config, mutation } = useConfigFieldMutation<StartupView>(repository, (config, startupView) => ({
    ...config,
    startupView,
  }))

  if (!config) return null

  const value = config.startupView ?? 'day'

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="startup-view-select">
        Default view on startup
      </label>
      <select
        id="startup-view-select"
        value={value}
        onChange={(e) => {
          if (isStartupView(e.target.value)) mutation.mutate(e.target.value)
        }}
        className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">Which view to show when opening the app.</p>
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Failed to save setting. Please try again.
        </p>
      )}
    </div>
  )
}

function isStartupView(v: string): v is StartupView {
  return ['last', 'day', 'month', 'table', 'table-with-log'].includes(v)
}
