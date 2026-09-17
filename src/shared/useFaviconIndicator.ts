import { useEffect } from 'react'

const COLORS = {
  red: '#dc2626',
  orange: '#f97316',
  green: '#16a34a',
  blue: '#2563eb',
} as const

export function faviconColor(isTracking: boolean, isOvertime: boolean): string {
  if (isOvertime) return isTracking ? COLORS.blue : COLORS.green
  return isTracking ? COLORS.orange : COLORS.red
}

function faviconSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><path d="M6.5 7h19v4.2h-7.3V25h-4.4V11.2H6.5z" fill="#f9fafb"/></svg>`
}

/** Recolors the browser tab favicon to reflect tracking/overtime state — see faviconColor for the mapping. */
export function useFaviconIndicator(isTracking: boolean, isOvertime: boolean) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    link.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(faviconColor(isTracking, isOvertime)))}`
  }, [isTracking, isOvertime])
}
