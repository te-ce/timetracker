import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { AppConfig, ConfigRepository } from '../../infra/repositories/types'

export interface BooleanConfigToggleProps {
  repository: ConfigRepository
  label: string
  description: string
  isChecked: (config: AppConfig) => boolean
  applyChange: (config: AppConfig, checked: boolean) => AppConfig
  onAfterSave?: (checked: boolean) => Promise<void> | void
  /** 'compact' matches most settings rows; 'spaced' indents the checkbox from a larger label (used by Electron-only toggles). */
  variant?: 'compact' | 'spaced'
}

/** A single boolean field in AppConfig, rendered as a checkbox and persisted on change. */
export function BooleanConfigToggle({
  repository,
  label,
  description,
  isChecked,
  applyChange,
  onAfterSave,
  variant = 'compact',
}: BooleanConfigToggleProps) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: async (checked: boolean) => {
      await repository.save(applyChange(config!, checked))
      await onAfterSave?.(checked)
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const checked = isChecked(config)

  if (variant === 'spaced') {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            aria-label={label}
            checked={checked}
            onChange={(e) => mutation.mutate(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium dark:text-gray-100">{label}</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{description}</p>
        {mutation.isError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400 ml-7">
            Failed to save setting. Please try again.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => mutation.mutate(e.target.checked)}
          className="rounded"
        />
        {label}
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Failed to save setting. Please try again.
        </p>
      )}
    </div>
  )
}
