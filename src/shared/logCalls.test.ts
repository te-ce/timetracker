import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logCalls } from './logCalls'
import type { LogEntry } from './log'
import { InMemoryStorageAdapter } from '../infra/storage/in-memory-adapter'
import type { StorageAdapter } from '../infra/storage/adapter'

let written: LogEntry[]

beforeEach(() => {
  written = []
  for (const level of ['debug', 'info', 'error'] as const) vi.spyOn(console, level).mockImplementation(() => {})
  window.electronAPI = { log: { write: (e: LogEntry) => written.push(e) } } as unknown as NonNullable<
    typeof window.electronAPI
  >
})

afterEach(() => {
  vi.restoreAllMocks()
  delete window.electronAPI
})

const keyOnly = (args: unknown[]) => args[0]

describe('logCalls', () => {
  it('logs each write with its arguments and duration, and still performs it', async () => {
    const storage = logCalls(new InMemoryStorageAdapter(), 'storage', keyOnly)
    await storage.put('months/2026-10', { days: {} })

    expect(written).toEqual([
      expect.objectContaining({
        level: 'info',
        event: 'storage.put',
        data: { args: 'months/2026-10', ms: expect.any(Number) },
      }),
    ])
    expect(await storage.get('months/2026-10')).toEqual({ days: {} })
  })

  it('logs reads at debug level so they can be filtered out', async () => {
    const storage = logCalls(new InMemoryStorageAdapter(), 'storage', keyOnly)
    await storage.get('config.json')

    expect(written.map((e) => [e.level, e.event])).toEqual([['debug', 'storage.get']])
  })

  it('logs a failed call as an error and passes the rejection through', async () => {
    const failing: StorageAdapter = {
      get: () => Promise.resolve(null),
      put: () => Promise.reject(new Error('disk full')),
      delete: () => Promise.resolve(),
    }
    const storage = logCalls(failing, 'storage', keyOnly)

    await expect(storage.put('config.json', {})).rejects.toThrow('disk full')
    expect(written).toEqual([
      expect.objectContaining({
        level: 'error',
        event: 'storage.put',
        data: expect.objectContaining({
          args: 'config.json',
          error: expect.objectContaining({ message: 'disk full' }),
        }),
      }),
    ])
  })

  it('logs all arguments by default', () => {
    const repo = logCalls({ saveNote: (_date: string, _note: string) => undefined }, 'monthRepo')
    repo.saveNote('2026-10-16', 'standup ran long')

    expect(written[0]).toMatchObject({
      event: 'monthRepo.saveNote',
      data: { args: ['2026-10-16', 'standup ran long'] },
    })
  })
})
