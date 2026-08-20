import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { AppConfig, ConfigRepository } from '../../infra/repositories/types'
import { requireConfig } from '../../shared/appConfigDefaults'
import { Switch } from './Switch'

export interface SettingToggleProps {
  repository: ConfigRepository
  label: string
  description: string
  isChecked: (config: AppConfig) => boolean
  applyChange: (config: AppConfig, checked: boolean) => AppConfig
  onAfterSave?: (checked: boolean) => Promise<void> | void
}

export function SettingToggle({
  repository,
  label,
  description,
  isChecked,
  applyChange,
  onAfterSave,
}: SettingToggleProps) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: async (checked: boolean) => {
      await repository.save(applyChange(requireConfig(config), checked))
      await onAfterSave?.(checked)
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const checked = isChecked(config)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
        {label.charAt(0)}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium dark:text-gray-100">{label}</span>
          <Switch checked={checked} onChange={(v) => mutation.mutate(v)} label={label} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        {mutation.isError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Failed to save setting. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
