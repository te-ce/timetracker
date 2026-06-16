import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import type { StartupView } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

const OPTIONS: { value: StartupView; label: string }[] = [
  { value: 'day', label: 'Day View (current day)' },
  { value: 'month', label: 'Month View (current month)' },
  { value: 'table', label: 'Table View' },
  { value: 'table-with-log', label: 'Table View + work period log for today' },
  { value: 'last', label: 'Last view when closed' },
]

export function StartupViewSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (startupView: StartupView) => repository.save({ ...config!, startupView }),
    onSuccess: () => invalidateConfig(queryClient),
  })

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
      <p className="text-xs text-gray-500 dark:text-gray-400">Which view to open when launching the app.</p>
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
