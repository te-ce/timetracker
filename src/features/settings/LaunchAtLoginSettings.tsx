import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

export function LaunchAtLoginSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await repository.save({ ...config!, launchAtLogin: enabled })
      await window.electronAPI?.autolaunch.set(enabled)
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const checked = config.launchAtLogin ?? false

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          aria-label="Launch at login"
          checked={checked}
          onChange={(e) => mutation.mutate(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium dark:text-gray-100">Launch at login</span>
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">Start Timetracker automatically when you log in.</p>
    </div>
  )
}
