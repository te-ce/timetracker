import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { QUERY_KEYS } from './queryKeys'
import { resolveAppConfig, type ResolvedAppConfig } from './appConfigDefaults'

/**
 * The read seam for AppConfig: one query, every field resolved. Components
 * that write config keep using the repository directly — they need the stored
 * value, not the effective one.
 */
export function useAppConfig(): ResolvedAppConfig {
  const { configRepo } = useRepositories()
  const { data } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => configRepo.get() })
  return resolveAppConfig(data)
}
