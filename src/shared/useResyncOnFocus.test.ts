import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { configRepo } from '../infra/repositories/shared'
import { useResyncOnFocus } from './useResyncOnFocus'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: new QueryClient() }, children)
}

describe('useResyncOnFocus', () => {
  it.each(['focus', 'online'])('re-reads data changed elsewhere when the window gets a %s event', async (event) => {
    await configRepo.save({ ...(await configRepo.get()), autoCategory: 'before' })
    renderHook(() => useResyncOnFocus(), { wrapper })

    const stored: unknown = JSON.parse(localStorage.getItem('timetracker_config.json') ?? '{}')
    localStorage.setItem('timetracker_config.json', JSON.stringify({ ...Object(stored), autoCategory: 'other device' }))
    expect((await configRepo.get()).autoCategory).toBe('before')

    window.dispatchEvent(new Event(event))

    await waitFor(async () => expect((await configRepo.get()).autoCategory).toBe('other device'))
  })

  it('stops listening when unmounted', async () => {
    await configRepo.save({ ...(await configRepo.get()), autoCategory: 'before' })
    const { unmount } = renderHook(() => useResyncOnFocus(), { wrapper })
    unmount()

    const stored: unknown = JSON.parse(localStorage.getItem('timetracker_config.json') ?? '{}')
    localStorage.setItem('timetracker_config.json', JSON.stringify({ ...Object(stored), autoCategory: 'other device' }))
    window.dispatchEvent(new Event('focus'))
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect((await configRepo.get()).autoCategory).toBe('before')
  })
})
