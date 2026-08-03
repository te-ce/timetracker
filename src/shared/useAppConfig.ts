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
  return useAppConfigState().config
}

/**
 * Like `useAppConfig`, but also exposes whether the real config has loaded
 * yet. Callers that feed `config` (e.g. `weekdayHours`) into another query's
 * `queryFn` need this — otherwise that query can fire once with
 * `resolveAppConfig(undefined)`'s defaults and cache the wrong result
 * indefinitely, since its query key doesn't vary with config.
 */
export function useAppConfigState(): { config: ResolvedAppConfig; isPending: boolean } {
  const { configRepo } = useRepositories()
  const { data, isPending } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => configRepo.get() })
  return { config: resolveAppConfig(data), isPending }
}
