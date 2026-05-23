import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../hooks/queryKeys'
import type { ConfigRepository } from '../repositories/types'
import { BUNDESLAENDER } from '../domain/holidays'
import type { Bundesland } from '../domain/holidays'

interface Props {
  repository: ConfigRepository
}

export function BundeslandSettings({ repository }: Props) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (state: Bundesland | null) => repository.save({ ...config!, federalState: state }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  if (!config) return null

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="bundesland-select" className="text-sm font-medium">
        Bundesland
      </label>
      <select
        id="bundesland-select"
        aria-label="Bundesland"
        value={config.federalState ?? ''}
        onChange={(e) => {
          const val = e.target.value
          mutation.mutate(val === '' ? null : (val as Bundesland))
        }}
        className="w-64 rounded border px-3 py-2 text-sm"
      >
        <option value="">None</option>
        {BUNDESLAENDER.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">Used to auto-detect public holidays for your state.</p>
    </div>
  )
}
