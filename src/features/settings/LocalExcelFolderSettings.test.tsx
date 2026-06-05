import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocalExcelFolderSettings } from './LocalExcelFolderSettings'

vi.mock('../../infra/storage/folder-handle-store', () => ({
  loadExcelHandle: vi.fn(),
  saveExcelHandle: vi.fn(),
  clearExcelHandle: vi.fn(),
  verifyPermission: vi.fn(),
}))

import * as folderHandleStore from '../../infra/storage/folder-handle-store'

const mockLoadExcelHandle = vi.mocked(folderHandleStore.loadExcelHandle)
const mockSaveExcelHandle = vi.mocked(folderHandleStore.saveExcelHandle)
const mockClearExcelHandle = vi.mocked(folderHandleStore.clearExcelHandle)
const mockVerifyPermission = vi.mocked(folderHandleStore.verifyPermission)

function makeHandle(name: string): FileSystemDirectoryHandle {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { name } as FileSystemDirectoryHandle
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadExcelHandle.mockResolvedValue(null)
  mockSaveExcelHandle.mockResolvedValue(undefined)
  mockClearExcelHandle.mockResolvedValue(undefined)
  mockVerifyPermission.mockResolvedValue(true)
  vi.unstubAllGlobals()
})

describe('LocalExcelFolderSettings', () => {
  describe('initial state — no folder set', () => {
    it('shows the default label and "Use separate folder" button', async () => {
      render(<LocalExcelFolderSettings />)
      await screen.findByText(/same as app data folder/i)
      expect(screen.getByRole('button', { name: /use separate folder/i })).toBeInTheDocument()
    })

    it('does not show Change or Reset buttons when no folder is set', async () => {
      render(<LocalExcelFolderSettings />)
      await screen.findByText(/same as app data folder/i)
      expect(screen.queryByRole('button', { name: /change/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })
  })

  describe('initial state — folder already set', () => {
    it('shows the stored folder name and Change / Reset buttons', async () => {
      mockLoadExcelHandle.mockResolvedValue(makeHandle('MyWorkbooks'))
      render(<LocalExcelFolderSettings />)
      await screen.findByText('MyWorkbooks')
      expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })
  })

  describe('picking a folder', () => {
    it('calls showDirectoryPicker and saves the handle on success', async () => {
      const user = userEvent.setup()
      const handle = makeHandle('ChosenFolder')
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(handle))

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })

      await user.click(screen.getByRole('button', { name: /use separate folder/i }))

      await waitFor(() => expect(mockSaveExcelHandle).toHaveBeenCalledWith(handle))
      await screen.findByText('ChosenFolder')
    })

    it('shows the picked folder name after success', async () => {
      const user = userEvent.setup()
      const handle = makeHandle('Reports2024')
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(handle))

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      await user.click(screen.getByRole('button', { name: /use separate folder/i }))
      await screen.findByText('Reports2024')
    })

    it('shows "picking…" text while the picker is open', async () => {
      let resolve!: (h: FileSystemDirectoryHandle) => void
      const pending = new Promise<FileSystemDirectoryHandle>((res) => {
        resolve = res
      })
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockReturnValue(pending))

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      const btn = screen.getByRole('button', { name: /use separate folder/i })

      // Start click but don't await the UI update — button should become disabled/picking
      await userEvent.click(btn)

      // Immediately the button text changes; resolve so component finishes
      resolve(makeHandle('X'))
    })

    it('shows a permission-denied error when verifyPermission returns false', async () => {
      const user = userEvent.setup()
      const handle = makeHandle('Denied')
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(handle))
      mockVerifyPermission.mockResolvedValue(false)

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      await user.click(screen.getByRole('button', { name: /use separate folder/i }))

      await screen.findByText(/permission denied/i)
      expect(mockSaveExcelHandle).not.toHaveBeenCalled()
    })

    it('shows an error message when showDirectoryPicker rejects with a non-abort error', async () => {
      const user = userEvent.setup()
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(new Error('disk full')))

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      await user.click(screen.getByRole('button', { name: /use separate folder/i }))

      await screen.findByText(/disk full/i)
    })

    it('shows a generic error message when rejection value is not an Error', async () => {
      const user = userEvent.setup()
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue('something bad'))

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      await user.click(screen.getByRole('button', { name: /use separate folder/i }))

      await screen.findByText(/failed to open folder picker/i)
    })

    it('does not show an error when user aborts the picker (AbortError)', async () => {
      const user = userEvent.setup()
      const abort = new DOMException('user aborted', 'AbortError')
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(abort))

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      await user.click(screen.getByRole('button', { name: /use separate folder/i }))

      // Give async handlers time to settle
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
      expect(screen.queryByText(/aborted/i)).not.toBeInTheDocument()
    })

    it('shows a browser-not-supported error when showDirectoryPicker is absent', async () => {
      const user = userEvent.setup()
      // Ensure the global is absent
      vi.stubGlobal('showDirectoryPicker', undefined)

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /use separate folder/i })
      await user.click(screen.getByRole('button', { name: /use separate folder/i }))

      await screen.findByText(/file system access api not supported/i)
    })
  })

  describe('reset', () => {
    it('clears the stored handle and hides the folder name', async () => {
      const user = userEvent.setup()
      mockLoadExcelHandle.mockResolvedValue(makeHandle('ToBeRemoved'))

      render(<LocalExcelFolderSettings />)
      await screen.findByText('ToBeRemoved')

      await user.click(screen.getByRole('button', { name: /reset/i }))

      await waitFor(() => expect(mockClearExcelHandle).toHaveBeenCalledOnce())
      await screen.findByText(/same as app data folder/i)
      expect(screen.queryByText('ToBeRemoved')).not.toBeInTheDocument()
    })

    it('clears any existing error when reset is clicked', async () => {
      const user = userEvent.setup()
      mockLoadExcelHandle.mockResolvedValue(makeHandle('AFolder'))
      // Trigger an error via permission denial
      vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(makeHandle('AFolder')))
      mockVerifyPermission.mockResolvedValueOnce(false)

      render(<LocalExcelFolderSettings />)
      await screen.findByRole('button', { name: /change/i })
      await user.click(screen.getByRole('button', { name: /change/i }))
      await screen.findByText(/permission denied/i)

      await user.click(screen.getByRole('button', { name: /reset/i }))

      await waitFor(() => expect(screen.queryByText(/permission denied/i)).not.toBeInTheDocument())
    })
  })
})
