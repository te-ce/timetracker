import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClearDataSettings } from './ClearDataSettings'

function makeDeleteDbRequest(outcome: 'success' | 'error' | 'blocked' = 'success') {
  type Handler = ((e: Event) => void) | null
  let successFn: Handler = null
  let errorFn: Handler = null
  let blockedFn: Handler = null
  const req = {
    get onsuccess() {
      return successFn
    },
    set onsuccess(fn: Handler) {
      successFn = fn
      if (outcome === 'success' && fn) queueMicrotask(() => fn.call(req, new Event('success')))
    },
    get onerror() {
      return errorFn
    },
    set onerror(fn: Handler) {
      errorFn = fn
      if (outcome === 'error' && fn) queueMicrotask(() => fn.call(req, new Event('error')))
    },
    get onblocked() {
      return blockedFn
    },
    set onblocked(fn: Handler) {
      blockedFn = fn
      if (outcome === 'blocked' && fn) queueMicrotask(() => fn.call(req, new IDBVersionChangeEvent('blocked')))
    },
  }
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('ClearDataSettings', () => {
  it('shows Clear data… button initially', () => {
    render(<ClearDataSettings />)
    expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument()
  })

  it('shows Confirm clear and Cancel after clicking Clear data…', async () => {
    const user = userEvent.setup()
    render(<ClearDataSettings />)
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    expect(screen.getByRole('button', { name: /confirm clear/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('reverts to initial state when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ClearDataSettings />)
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm clear/i })).not.toBeInTheDocument()
  })

  it('calls window.location.reload after confirming clear', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    vi.stubGlobal('location', { reload: reloadMock })
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn().mockReturnValue(makeDeleteDbRequest('success')),
    })

    render(<ClearDataSettings />)
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /confirm clear/i }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledOnce())
  })

  it('removes timetracker-prefixed localStorage keys on confirm', async () => {
    localStorage.setItem('timetracker-foo', 'val')
    localStorage.setItem('msal-bootstrap-bar', 'val')
    localStorage.setItem('other-key', 'keep')

    const user = userEvent.setup()
    vi.stubGlobal('location', { reload: vi.fn() })
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn().mockReturnValue(makeDeleteDbRequest('success')),
    })

    render(<ClearDataSettings />)
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /confirm clear/i }))

    await waitFor(() => {
      expect(localStorage.getItem('timetracker-foo')).toBeNull()
      expect(localStorage.getItem('msal-bootstrap-bar')).toBeNull()
      expect(localStorage.getItem('other-key')).toBe('keep')
    })
  })

  it('resolves even when indexedDB deleteDatabase triggers error', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    vi.stubGlobal('location', { reload: reloadMock })
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn().mockReturnValue(makeDeleteDbRequest('error')),
    })

    render(<ClearDataSettings />)
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /confirm clear/i }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledOnce())
  })

  it('resolves even when indexedDB deleteDatabase triggers blocked', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    vi.stubGlobal('location', { reload: reloadMock })
    vi.stubGlobal('indexedDB', {
      deleteDatabase: vi.fn().mockReturnValue(makeDeleteDbRequest('blocked')),
    })

    render(<ClearDataSettings />)
    await user.click(screen.getByRole('button', { name: /clear data/i }))
    await user.click(screen.getByRole('button', { name: /confirm clear/i }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledOnce())
  })
})
