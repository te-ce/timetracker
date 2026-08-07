import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { MonthRepository, ConfigRepository, SprintExportRepository, TrashRepository } from './types'
import { monthRepo, configRepo, sprintExportRepo, trashRepo } from './shared'

export interface Repositories {
  monthRepo: MonthRepository
  configRepo: ConfigRepository
  sprintExportRepo: SprintExportRepository
  trashRepo: TrashRepository
}

const defaultRepositories: Repositories = { monthRepo, configRepo, sprintExportRepo, trashRepo }

const RepositoryContext = createContext<Repositories>(defaultRepositories)

export function RepositoryProvider({ children, repos }: { children: ReactNode; repos?: Repositories }) {
  return <RepositoryContext.Provider value={repos ?? defaultRepositories}>{children}</RepositoryContext.Provider>
}

export function useRepositories(): Repositories {
  return useContext(RepositoryContext)
}
