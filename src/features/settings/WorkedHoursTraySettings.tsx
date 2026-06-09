import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

export function WorkedHoursTraySettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (show: boolean) => repository.save({ ...config!, showWorkedHoursInTray: show }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const checked = config.showWorkedHoursInTray !== false

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => mutation.mutate(e.target.checked)}
          className="rounded"
        />
        Show worked hours in tray menu
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Display the detailed hours breakdown in the tray icon menu. The remaining/overtime badge next to the icon is
        always shown.
      </p>
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Failed to save setting. Please try again.
        </p>
      )}
    </div>
  )
}
