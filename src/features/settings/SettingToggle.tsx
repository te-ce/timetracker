import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { AppConfig, ConfigRepository } from '../../infra/repositories/types'

export interface SettingToggleProps {
  repository: ConfigRepository
  label: string
  description: string
  isChecked: (config: AppConfig) => boolean
  applyChange: (config: AppConfig, checked: boolean) => AppConfig
  onAfterSave?: (checked: boolean) => Promise<void> | void
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

/** A single boolean field in AppConfig, rendered as a card with a switch and persisted on change. */
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
      await repository.save(applyChange(config!, checked))
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
