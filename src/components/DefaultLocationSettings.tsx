import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository, WorkLocation } from '../repositories/types'

interface Props {
  repository: ConfigRepository
}

export function DefaultLocationSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (loc: WorkLocation) => repository.save({ ...config!, defaultWorkLocation: loc }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  if (!config) return null

  const WORK_LOCATIONS: WorkLocation[] = ['Remote', 'Office']

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="default-location-select" className="text-sm font-medium">
        Default Work Location
      </label>
      <div className="flex gap-2">
        {WORK_LOCATIONS.map((loc) => (
          <button
            key={loc}
            onClick={() => mutation.mutate(loc)}
            className={`rounded border px-4 py-1.5 text-sm transition-colors ${
              (config.defaultWorkLocation ?? 'Remote') === loc
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                : 'text-gray-600 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {loc === 'Office' ? '🏢 Office' : '🏠 Remote'}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Used as the default location for days with no explicit override.</p>
    </div>
  )
}
