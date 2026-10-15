import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncIndicator } from './SyncIndicator'
import { useSyncStatus } from '../../infra/storage/sync-status'

afterEach(() => {
  useSyncStatus.setState({ pendingWrites: 0, signInRequired: false })
})

describe('SyncIndicator', () => {
  it('shows the normal mode label when everything is synced', () => {
    render(<SyncIndicator />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows how many changes are not in OneDrive yet, with a retry button', () => {
    useSyncStatus.setState({ pendingWrites: 3 })
    render(<SyncIndicator />)
    expect(screen.getByRole('button', { name: /3 unsynced changes/i })).toBeInTheDocument()
  })

  it('asks the user to sign in again when sync is paused for authentication', () => {
    useSyncStatus.setState({ pendingWrites: 2, signInRequired: true })
    render(<SyncIndicator />)
    expect(screen.getByRole('button', { name: /sync paused.*sign in/i })).toBeInTheDocument()
  })
})
