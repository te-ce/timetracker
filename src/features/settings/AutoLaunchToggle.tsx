import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { requireConfig } from '../../shared/appConfigDefaults'
import { Switch } from './Switch'

/**
 * Unlike SettingToggle, the OS login-item registration is the source of
 * truth here, not the stored config — config.launchAtLogin can silently
 * drift from what's actually registered (e.g. a failed or stale OS call),
 * which is exactly what left the app not launching at login while Settings
 * still showed it as on. The OS call also runs before the config write, so
 * a failure never gets persisted as if it had succeeded.
 */
export function AutoLaunchToggle({ repository }: { repository: ConfigRepository }) {
  const queryClient = useQueryClient()
  const hasElectron = !!window.electronAPI

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const { data: osEnabled } = useQuery({
    queryKey: QUERY_KEYS.autoLaunch,
    queryFn: () => window.electronAPI?.autolaunch.get() ?? Promise.resolve(false),
    enabled: hasElectron,
  })

  const mutation = useMutation({
    mutationFn: async (checked: boolean) => {
      await window.electronAPI?.autolaunch.set(checked)
      await repository.save({ ...requireConfig(config), launchAtLogin: checked })
    },
    onSuccess: () => invalidateConfig(queryClient),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.autoLaunch }),
  })

  if (!config) return null

  const checked = hasElectron ? (osEnabled ?? false) : (config.launchAtLogin ?? false)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
        L
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium dark:text-gray-100">Launch at login</span>
          <Switch checked={checked} onChange={(v) => mutation.mutate(v)} label="Launch at login" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Start Timetracker automatically when you log in.</p>
        {mutation.isError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Failed to change launch-at-login. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
