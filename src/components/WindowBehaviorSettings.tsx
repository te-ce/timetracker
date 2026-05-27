import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository } from '../repositories/types'

interface Props {
  repository: ConfigRepository
}

export function WindowBehaviorSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (patch: { startMinimized?: boolean; closeToTray?: boolean }) =>
      repository.save({ ...config!, ...patch }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  if (!config) return null

  const startMinimized = config.startMinimized ?? false
  const closeToTray = config.closeToTray ?? true

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          aria-label="Start minimized"
          checked={startMinimized}
          onChange={(e) => mutation.mutate({ startMinimized: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <div>
          <span className="text-sm font-medium dark:text-gray-100">Start minimized</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hide window on startup — accessible from the tray icon.
          </p>
        </div>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          aria-label="Close to tray"
          checked={closeToTray}
          onChange={(e) => mutation.mutate({ closeToTray: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <div>
          <span className="text-sm font-medium dark:text-gray-100">Close to tray</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Keep running in the background when the window is closed.
          </p>
        </div>
      </label>
    </div>
  )
}
