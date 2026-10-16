import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { log, type LogEntry } from './log'

let written: LogEntry[]

beforeEach(() => {
  written = []
  vi.useFakeTimers({ now: new Date('2026-10-16T09:15:00.000Z') })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  window.electronAPI = { log: { write: (e: LogEntry) => written.push(e) } } as unknown as NonNullable<
    typeof window.electronAPI
  >
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete window.electronAPI
})

describe('log', () => {
  it('sends a timestamped renderer entry to the Electron log file', () => {
    log.info('tracking:start', { category: 'dev' })

    expect(written).toEqual([
      {
        ts: '2026-10-16T09:15:00.000Z',
        level: 'info',
        source: 'renderer',
        event: 'tracking:start',
        data: { category: 'dev' },
      },
    ])
  })

  it('turns Errors into plain name/message/stack so they survive JSON', () => {
    const err = new Error('boom')
    log.error('save failed', { key: 'months/2026-10', error: err })

    expect(written[0]?.data).toEqual({
      key: 'months/2026-10',
      error: { name: 'Error', message: 'boom', stack: err.stack },
    })
    expect(JSON.parse(JSON.stringify(written[0]))).toEqual(written[0])
  })

  it('still logs to the console without Electron', () => {
    delete window.electronAPI
    log.info('route', { to: '/month' })

    expect(console.info).toHaveBeenCalledWith('[info] route', { to: '/month' })
  })
})
