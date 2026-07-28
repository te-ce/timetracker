import type { ConfigRepository } from '../../infra/repositories/types'
import { useConfigFieldMutation } from './useConfigFieldMutation'

interface Props {
  repository: ConfigRepository
}

export function WindowBehaviorSettings({ repository }: Props) {
  const { config, mutation } = useConfigFieldMutation<{ startMinimized?: boolean; closeToTray?: boolean }>(
    repository,
    (config, patch) => ({ ...config, ...patch }),
  )

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
