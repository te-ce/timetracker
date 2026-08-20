import { createContext, useContext } from 'react'
import type { MonthRepository, ConfigRepository, SprintExportRepository, TrashRepository } from './types'
import { monthRepo, configRepo, sprintExportRepo, trashRepo } from './shared'

export interface Repositories {
  monthRepo: MonthRepository
  configRepo: ConfigRepository
  sprintExportRepo: SprintExportRepository
  trashRepo: TrashRepository
}

export const defaultRepositories: Repositories = { monthRepo, configRepo, sprintExportRepo, trashRepo }

/**
 * The repositories, as context.
 *
 * Kept apart from the provider component so that file declares only a component:
 * the context and the hook that reads it are not views.
 */
export const RepositoryContext = createContext<Repositories>(defaultRepositories)

export function useRepositories(): Repositories {
  return useContext(RepositoryContext)
}
