// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTodayIso } from './useTodayIso'

describe('useTodayIso', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns today ISO date on mount', () => {
    vi.setSystemTime(new Date(2026, 5, 29, 10, 0, 0))
    const { result } = renderHook(() => useTodayIso())
    expect(result.current).toBe('2026-06-29')
  })

  it('updates when midnight passes', () => {
    vi.setSystemTime(new Date(2026, 5, 29, 23, 59, 59, 0))
    const { result } = renderHook(() => useTodayIso())
    expect(result.current).toBe('2026-06-29')

    act(() => {
      vi.setSystemTime(new Date(2026, 5, 30, 0, 0, 1))
      vi.runAllTimers()
    })
    expect(result.current).toBe('2026-06-30')
  })

  it('updates on visibilitychange when date has changed (laptop wake)', () => {
    vi.setSystemTime(new Date(2026, 5, 29, 23, 0, 0))
    const { result } = renderHook(() => useTodayIso())
    expect(result.current).toBe('2026-06-29')

    act(() => {
      vi.setSystemTime(new Date(2026, 5, 30, 9, 0, 0))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe('2026-06-30')
  })
})
