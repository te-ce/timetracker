import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

export function RemainingTimeSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (usePlannedStop: boolean) =>
      repository.save({
        ...config!,
        remainingTimeReference: usePlannedStop ? 'planned-stop' : 'target-hours',
      }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const checked = config.remainingTimeReference !== 'target-hours'

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => mutation.mutate(e.target.checked)}
          className="rounded"
        />
        Show countdown to planned stop
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        When a planned stop time is set on the current work period, show the remaining time until that stop in the badge
        and tab title. Disable to always show remaining time until the daily target is reached.
      </p>
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Failed to save setting. Please try again.
        </p>
      )}
    </div>
  )
}
