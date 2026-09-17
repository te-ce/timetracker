import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFaviconIndicator, faviconColor } from './useFaviconIndicator'

describe('faviconColor', () => {
  it('is red when not tracking and in undertime', () => {
    expect(faviconColor(false, false)).toBe('#dc2626')
  })

  it('is orange when tracking and in undertime', () => {
    expect(faviconColor(true, false)).toBe('#f97316')
  })

  it('is blue when tracking and in overtime', () => {
    expect(faviconColor(true, true)).toBe('#2563eb')
  })

  it('is green when not tracking and in overtime', () => {
    expect(faviconColor(false, true)).toBe('#16a34a')
  })
})

describe('useFaviconIndicator', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove())
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = '/favicon.svg'
    document.head.appendChild(link)
  })

  it('recolors the favicon link to match the current state', () => {
    renderHook(() => useFaviconIndicator(true, true))
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link?.href).toContain(encodeURIComponent('#2563eb'))
  })

  it('updates the favicon when state changes', () => {
    const { rerender } = renderHook(({ isTracking, isOvertime }) => useFaviconIndicator(isTracking, isOvertime), {
      initialProps: { isTracking: false, isOvertime: false },
    })
    rerender({ isTracking: false, isOvertime: true })
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link?.href).toContain(encodeURIComponent('#16a34a'))
  })
})
