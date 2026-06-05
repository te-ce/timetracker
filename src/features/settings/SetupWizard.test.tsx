import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupWizard } from './SetupWizard'

vi.mock('../../infra/auth/bootstrapConfig', () => ({
  writeBootstrapConfig: vi.fn(),
  skipSetup: vi.fn(),
  setLocalFolderMode: vi.fn(),
}))

vi.mock('../../infra/storage/folder-handle-store', () => ({
  saveHandle: vi.fn(),
}))

import * as bootstrapConfig from '../../infra/auth/bootstrapConfig'
import * as folderHandleStore from '../../infra/storage/folder-handle-store'

const mockSaveHandle = vi.mocked(folderHandleStore.saveHandle)

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  mockSaveHandle.mockResolvedValue(undefined)
})

describe('SetupWizard', () => {
  it('renders the Client ID and Tenant ID inputs', () => {
    render(<SetupWizard onSkip={() => {}} />)
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant/i)).toBeInTheDocument()
  })

  it('shows an error when saving with empty fields', () => {
    render(<SetupWizard onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/required/i)).toBeInTheDocument()
    expect(bootstrapConfig.writeBootstrapConfig).not.toHaveBeenCalled()
  })

  it('calls writeBootstrapConfig with trimmed values on save', () => {
    render(<SetupWizard onSkip={() => {}} />)
    fireEvent.change(screen.getByLabelText(/client/i), { target: { value: ' cid ' } })
    fireEvent.change(screen.getByLabelText(/tenant/i), { target: { value: ' tid ' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(bootstrapConfig.writeBootstrapConfig).toHaveBeenCalledWith({ clientId: 'cid', tenantId: 'tid' })
  })

  it('calls skipSetup and onSkip when skip is clicked', () => {
    const onSkip = vi.fn()
    render(<SetupWizard onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(bootstrapConfig.skipSetup).toHaveBeenCalled()
    expect(onSkip).toHaveBeenCalled()
  })

  // --- "Use Local Folder" button ---

  it('calls saveHandle, setLocalFolderMode, and reloads on successful folder pick', async () => {
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const handle = { name: 'MyFolder' } as FileSystemDirectoryHandle
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(handle))
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    })

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await waitFor(() => expect(mockSaveHandle).toHaveBeenCalledWith(handle))
    expect(bootstrapConfig.setLocalFolderMode).toHaveBeenCalled()
    expect(reloadSpy).toHaveBeenCalled()
  })

  it('does not show an error when the user aborts the folder picker', async () => {
    const user = userEvent.setup()
    const abort = new DOMException('user aborted', 'AbortError')
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(abort))

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await waitFor(() => {
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
    })
  })

  it('shows a detailed error when showDirectoryPicker rejects with a non-abort DOMException', async () => {
    const user = userEvent.setup()
    const err = new DOMException('quota exceeded', 'QuotaExceededError')
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(err))

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await screen.findByText(/QuotaExceededError/i)
  })

  it('shows a generic error when showDirectoryPicker rejects with a plain Error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(new Error('disk full')))

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await screen.findByText(/disk full/i)
  })

  // --- browser-detection error messages when showDirectoryPicker is absent ---

  it('shows a not-secure-context error when the page is not served over HTTPS', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', undefined)
    Object.defineProperty(window, 'isSecureContext', { value: false, writable: true, configurable: true })
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120',
      writable: true,
      configurable: true,
    })

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await screen.findByText(/https or localhost/i)

    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true, configurable: true })
  })

  it('shows Firefox-specific guidance when the UA is Firefox', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', undefined)
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true, configurable: true })
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0',
      writable: true,
      configurable: true,
    })

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await screen.findByText(/firefox does not support the file system access api/i)
  })

  it('shows a fallback unsupported message for unrecognised browsers', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', undefined)
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true, configurable: true })
    Object.defineProperty(navigator, 'userAgent', {
      value: 'SomeFutureUnknownBrowser/1.0',
      writable: true,
      configurable: true,
    })
    // Ensure 'brave' is not in navigator
    if ('brave' in navigator) {
      Object.defineProperty(navigator, 'brave', { value: undefined, writable: true, configurable: true })
    }

    render(<SetupWizard onSkip={() => {}} />)
    await user.click(screen.getByRole('button', { name: /use local folder/i }))

    await screen.findByText(/file system access api not supported/i)
  })
})
