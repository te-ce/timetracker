import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

export function RemainingTimeModeSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (dailyTargetOnly: boolean) =>
      repository.save({
        ...config!,
        remainingTimeMode: dailyTargetOnly ? 'until-daily-target' : 'until-zero-overtime',
      }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const checked = config.remainingTimeMode === 'until-daily-target'

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => mutation.mutate(e.target.checked)}
          className="rounded"
        />
        Show remaining until today's target only
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        When enabled, the remaining time in the badge, overtime bar, and taskbar shows how much time is left until
        today's target hours are met — without subtracting prior overtime carry-over. Disable to show the time left
        until your cumulative overtime balance reaches zero.
      </p>
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Failed to save setting. Please try again.
        </p>
      )}
    </div>
  )
}
