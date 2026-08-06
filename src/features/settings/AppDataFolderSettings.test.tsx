import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../infra/storage/folder-handle-store', () => ({
  loadHandle: vi.fn(),
  saveHandle: vi.fn(),
  verifyPermission: vi.fn(),
}))

import * as folderHandleStore from '../../infra/storage/folder-handle-store'
import { AppDataFolderSettings } from './AppDataFolderSettings'
import { LOCAL_FOLDER_PATH_KEY } from '../../infra/storage/electron-local-folder-adapter'

const mockLoadHandle = vi.mocked(folderHandleStore.loadHandle)
const mockSaveHandle = vi.mocked(folderHandleStore.saveHandle)
const mockVerifyPermission = vi.mocked(folderHandleStore.verifyPermission)

function makeHandle(name: string): FileSystemDirectoryHandle {
  return { name } as FileSystemDirectoryHandle
}

function makeElectronApiStub(overrides: {
  storagePath?: string | null
  pickFolder?: string | null
}): NonNullable<typeof window.electronAPI> {
  return {
    autolaunch: { get: () => Promise.resolve(false), set: () => Promise.resolve() },
    tray: {
      sync: () => {},
      onStartSubtask: () => {},
      offStartSubtask: () => {},
      onStopSubtask: () => {},
      offStopSubtask: () => {},
      onStopAll: () => {},
      offStopAll: () => {},
      onStartWorkPeriod: () => {},
      offStartWorkPeriod: () => {},
      onTogglePresentingMode: () => {},
      offTogglePresentingMode: () => {},
    },
    hotkey: {
      onToggle: () => {},
      offToggle: () => {},
      onTogglePresenting: () => {},
      offTogglePresenting: () => {},
      setGlobal: () => Promise.resolve(),
      setPresenting: () => Promise.resolve(),
    },
    storage: {
      get: <T,>(key: string) =>
        Promise.resolve(key === LOCAL_FOLDER_PATH_KEY ? ((overrides.storagePath ?? null) as T | null) : null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    localFolder: {
      pickFolder: () => Promise.resolve(overrides.pickFolder ?? null),
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    },
    notify: { goalReached: () => {}, sprintExportDue: () => {} },
    window: { onShow: () => {}, offShow: () => {} },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadHandle.mockResolvedValue(null)
  mockSaveHandle.mockResolvedValue(undefined)
  mockVerifyPermission.mockResolvedValue(true)
  vi.unstubAllGlobals()
  delete window.electronAPI
})

describe('AppDataFolderSettings', () => {
  it('renders nothing when no folder handle is stored', async () => {
    mockLoadHandle.mockResolvedValue(null)
    const { container } = render(<AppDataFolderSettings />)
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('shows folder name and Change button when handle exists', async () => {
    mockLoadHandle.mockResolvedValue(makeHandle('MyData'))
    render(<AppDataFolderSettings />)
    await screen.findByText('MyData')
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument()
  })

  it('calls showDirectoryPicker and reloads on successful folder pick', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    vi.stubGlobal('location', { reload: reloadMock })

    const handle = makeHandle('NewFolder')
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(handle))
    mockLoadHandle.mockResolvedValue(makeHandle('OldFolder'))

    render(<AppDataFolderSettings />)
    await screen.findByRole('button', { name: /change/i })
    await user.click(screen.getByRole('button', { name: /change/i }))

    await waitFor(() => expect(mockSaveHandle).toHaveBeenCalledWith(handle))
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('shows permission-denied error when verifyPermission returns false', async () => {
    const user = userEvent.setup()
    mockVerifyPermission.mockResolvedValue(false)
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(makeHandle('Denied')))
    mockLoadHandle.mockResolvedValue(makeHandle('ExistingFolder'))

    render(<AppDataFolderSettings />)
    await screen.findByRole('button', { name: /change/i })
    await user.click(screen.getByRole('button', { name: /change/i }))

    await screen.findByText(/permission denied/i)
    expect(mockSaveHandle).not.toHaveBeenCalled()
  })

  it('shows a browser-not-supported error when showDirectoryPicker is absent', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', undefined)
    mockLoadHandle.mockResolvedValue(makeHandle('ExistingFolder'))

    render(<AppDataFolderSettings />)
    await screen.findByRole('button', { name: /change/i })
    await user.click(screen.getByRole('button', { name: /change/i }))

    await screen.findByText(/file system access api not supported/i)
  })

  it('shows error message when picker rejects with non-abort error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(new Error('disk full')))
    mockLoadHandle.mockResolvedValue(makeHandle('ExistingFolder'))

    render(<AppDataFolderSettings />)
    await screen.findByRole('button', { name: /change/i })
    await user.click(screen.getByRole('button', { name: /change/i }))

    await screen.findByText(/disk full/i)
  })

  it('shows generic error when picker rejects with non-Error value', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue('something bad'))
    mockLoadHandle.mockResolvedValue(makeHandle('ExistingFolder'))

    render(<AppDataFolderSettings />)
    await screen.findByRole('button', { name: /change/i })
    await user.click(screen.getByRole('button', { name: /change/i }))

    await screen.findByText(/failed to open folder picker/i)
  })

  it('falls back to the browser handle name in Electron when no native path is configured yet', async () => {
    window.electronAPI = makeElectronApiStub({ storagePath: null })
    mockLoadHandle.mockResolvedValue(makeHandle('OldHandleFolder'))

    render(<AppDataFolderSettings />)

    await screen.findByText('OldHandleFolder')
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument()
  })

  it('shows the native path and picks a new one via the native dialog in Electron', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    vi.stubGlobal('location', { reload: reloadMock })
    window.electronAPI = makeElectronApiStub({ storagePath: '/old/path', pickFolder: '/new/path' })
    const putSpy = vi.mocked(window.electronAPI.storage.put)

    render(<AppDataFolderSettings />)

    await screen.findByText('/old/path')
    await user.click(screen.getByRole('button', { name: /change/i }))

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith(LOCAL_FOLDER_PATH_KEY, '/new/path'))
    expect(reloadMock).toHaveBeenCalledOnce()
    expect(mockSaveHandle).not.toHaveBeenCalled()
  })

  it('does not show error when user aborts picker (AbortError)', async () => {
    const user = userEvent.setup()
    const abort = new DOMException('user aborted', 'AbortError')
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(abort))
    mockLoadHandle.mockResolvedValue(makeHandle('ExistingFolder'))

    render(<AppDataFolderSettings />)
    await screen.findByRole('button', { name: /change/i })
    await user.click(screen.getByRole('button', { name: /change/i }))

    await waitFor(() => {
      expect(screen.queryByText(/aborted/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
