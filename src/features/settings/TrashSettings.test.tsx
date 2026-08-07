import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IDBFactory } from 'fake-indexeddb'
import { TrashSettings } from './TrashSettings'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { saveBackup } from '../../infra/storage/localBackup'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

function makeWrapper(configRepo = new InMemoryConfigRepository()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const monthRepo = new InMemoryMonthRepository({})
  const trashRepo = new InMemoryTrashRepository(monthRepo)
  const repos = { monthRepo, configRepo, sprintExportRepo: new InMemorySprintExportRepository(), trashRepo }
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  return { Wrapper, monthRepo, trashRepo, configRepo }
}

describe('TrashSettings', () => {
  it('shows an empty state when nothing is trashed', async () => {
    const { Wrapper, configRepo } = makeWrapper()
    render(<TrashSettings repository={configRepo} />, { wrapper: Wrapper })
    expect(await screen.findByText(/nothing in trash/i)).toBeInTheDocument()
  })

  it('lists a trashed month and restores it', async () => {
    const { Wrapper, trashRepo, monthRepo, configRepo } = makeWrapper()
    await trashRepo.moveMonthToTrash(2026, 6, { '2026-06-07': { windows: [] } })

    render(<TrashSettings repository={configRepo} />, { wrapper: Wrapper })
    const restoreBtn = await screen.findByRole('button', { name: /restore/i })
    await userEvent.click(restoreBtn)

    await waitFor(async () => {
      expect(await trashRepo.list()).toHaveLength(0)
    })
    const restored = await monthRepo.getMonth(2026, 6)
    expect(restored['2026-06-07']).toBeDefined()
  })

  it('permanently deletes a trashed entry without restoring it', async () => {
    const { Wrapper, trashRepo, monthRepo, configRepo } = makeWrapper()
    await trashRepo.moveMonthToTrash(2026, 6, { '2026-06-07': { windows: [] } })

    render(<TrashSettings repository={configRepo} />, { wrapper: Wrapper })
    const deleteBtn = await screen.findByRole('button', { name: /delete permanently/i })
    await userEvent.click(deleteBtn)

    await waitFor(async () => {
      expect(await trashRepo.list()).toHaveLength(0)
    })
    expect(await monthRepo.getMonth(2026, 6)).toEqual({})
  })

  it('lists a local-data backup', async () => {
    await saveBackup({ 'timetracker-foo': 'bar' })
    const { Wrapper, configRepo } = makeWrapper()
    render(<TrashSettings repository={configRepo} />, { wrapper: Wrapper })
    expect(await screen.findByText(/local data backup/i)).toBeInTheDocument()
  })

  it('saves the selected retention period to config', async () => {
    const { Wrapper, configRepo } = makeWrapper()
    render(<TrashSettings repository={configRepo} />, { wrapper: Wrapper })
    const select = await screen.findByRole('combobox')
    await userEvent.selectOptions(select, '90')
    await waitFor(async () => {
      const saved = await configRepo.get()
      expect(saved.trashRetentionDays).toBe(90)
    })
  })
})
