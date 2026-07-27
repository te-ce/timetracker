import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useHideOvertimeBar } from './useHideOvertimeBar'
import { InMemoryConfigRepository } from '../infra/repositories/in-memory/config-repository'
import { DEFAULT_APP_CONFIG } from './appConfigDefaults'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('useHideOvertimeBar', () => {
  it('saves showOvertimeBar: false on the config', async () => {
    const configRepo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showOvertimeBar: true })
    const { result } = renderHook(() => useHideOvertimeBar(configRepo), { wrapper: makeWrapper(makeQC()) })

    await act(async () => {
      result.current.mutate()
      await flush()
    })

    expect((await configRepo.get()).showOvertimeBar).toBe(false)
  })

  it('preserves other config fields', async () => {
    const configRepo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, autoCategory: 'Work' })
    const { result } = renderHook(() => useHideOvertimeBar(configRepo), { wrapper: makeWrapper(makeQC()) })

    await act(async () => {
      result.current.mutate()
      await flush()
    })

    expect((await configRepo.get()).autoCategory).toBe('Work')
  })
})
