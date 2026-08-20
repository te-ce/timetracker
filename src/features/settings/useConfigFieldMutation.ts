import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { AppConfig, ConfigRepository } from '../../infra/repositories/types'
import { requireConfig } from '../../shared/appConfigDefaults'

/** Reads AppConfig and mutates one field, invalidating the config query on save. */
export function useConfigFieldMutation<T>(
  repository: ConfigRepository,
  applyChange: (config: AppConfig, value: T) => AppConfig,
) {
  const queryClient = useQueryClient()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  const mutation = useMutation({
    mutationFn: (value: T) => repository.save(applyChange(requireConfig(config), value)),
    onSuccess: () => invalidateConfig(queryClient),
  })

  return { config, mutation }
}
