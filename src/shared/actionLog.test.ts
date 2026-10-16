import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installActionLogging } from './actionLog'
import type { LogEntry } from './log'

let written: LogEntry[]
let uninstall: () => void

beforeEach(() => {
  written = []
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  window.electronAPI = { log: { write: (e: LogEntry) => written.push(e) } } as unknown as NonNullable<
    typeof window.electronAPI
  >
  uninstall = installActionLogging(window)
})

afterEach(() => {
  uninstall()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  delete window.electronAPI
})

describe('installActionLogging', () => {
  it('logs which button the user pressed, even when the click lands on an inner element', () => {
    document.body.innerHTML = '<button type="button"><span>Stop</span> tracking</button>'
    document.querySelector('span')?.click()

    expect(written).toEqual([
      expect.objectContaining({
        level: 'info',
        event: 'ui:click',
        data: expect.objectContaining({ target: 'button "Stop tracking"' }),
      }),
    ])
  })

  it('prefers the aria-label over text', () => {
    document.body.innerHTML = '<button aria-label="Delete period">🗑</button>'
    document.querySelector('button')?.click()

    expect(written[0]?.data).toMatchObject({ target: 'button "Delete period"' })
  })

  it('ignores clicks on non-interactive content', () => {
    document.body.innerHTML = '<p>Just text</p>'
    document.querySelector('p')?.click()

    expect(written).toEqual([])
  })

  it('logs the new value of a changed field, but never a password', () => {
    document.body.innerHTML =
      '<select name="category"><option>dev</option><option>meeting</option></select><input type="password" name="pw" />'
    const select = document.querySelector('select')
    const pw = document.querySelector('input')
    if (!select || !pw) throw new Error('fixture')
    select.value = 'meeting'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    pw.value = 'secret'
    pw.dispatchEvent(new Event('change', { bubbles: true }))

    expect(written.map((e) => e.data)).toEqual([
      expect.objectContaining({ target: 'select[name=category]', value: 'meeting' }),
      expect.objectContaining({ target: 'input[name=pw]', value: '[redacted]' }),
    ])
  })

  it('logs uncaught errors and unhandled rejections', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    const rejection = new Event('unhandledrejection')
    Object.assign(rejection, { reason: new Error('nope') })
    window.dispatchEvent(rejection)

    expect(written.map((e) => [e.level, e.event])).toEqual([
      ['error', 'ui:uncaughtError'],
      ['error', 'ui:unhandledRejection'],
    ])
  })
})
