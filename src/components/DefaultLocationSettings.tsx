import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository, WorkLocation } from '../repositories/types'

interface Props {
  repository: ConfigRepository
}

export function DefaultLocationSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (loc: WorkLocation) => repository.save({ ...config!, defaultWorkLocation: loc }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  if (!config) return null

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="default-location-select" className="text-sm font-medium">
        Default Work Location
      </label>
      <div className="flex gap-2">
        {(['Remote', 'Office'] as WorkLocation[]).map((loc) => (
          <button
            key={loc}
            onClick={() => mutation.mutate(loc)}
            className={`rounded border px-4 py-1.5 text-sm transition-colors ${
              (config.defaultWorkLocation ?? 'Remote') === loc
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {loc === 'Office' ? '🏢 Office' : '🏠 Remote'}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Used as the default location for days with no explicit override.</p>
    </div>
  )
}
