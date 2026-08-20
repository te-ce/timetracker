import type { ReactNode } from 'react'
import { defaultRepositories, RepositoryContext, type Repositories } from './repositories-context'

export function RepositoryProvider({ children, repos }: { children: ReactNode; repos?: Repositories }) {
  return <RepositoryContext.Provider value={repos ?? defaultRepositories}>{children}</RepositoryContext.Provider>
}
