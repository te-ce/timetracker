import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

interface InputProps {
  current: number
  onSave: (hours: number) => void
}

function TargetHoursInput({ current, onSave }: InputProps) {
  const [localValue, setLocalValue] = useState(String(current))

  const handleBlur = () => {
    const val = parseFloat(localValue)
    if (!isNaN(val) && val > 0 && val <= 24) {
      onSave(val)
    } else {
      setLocalValue(String(current))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="target-hours-input" className="text-sm font-medium">
        Target hours per day
      </label>
      <input
        id="target-hours-input"
        aria-label="Target hours per day"
        type="number"
        min={0.5}
        max={24}
        step={0.5}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="w-32 rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">Used to calculate daily overtime.</p>
    </div>
  )
}

export function TargetHoursSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (hours: number) => repository.save({ ...config!, sollstunden: hours }),
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  return <TargetHoursInput key={config.sollstunden} current={config.sollstunden} onSave={mutation.mutate} />
}
