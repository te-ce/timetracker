import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SetupWizard } from './SetupWizard'

vi.mock('../auth/bootstrapConfig', () => ({
  writeBootstrapConfig: vi.fn(),
  skipSetup: vi.fn(),
}))

import * as bootstrapConfig from '../auth/bootstrapConfig'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SetupWizard', () => {
  it('renders the Client ID and Tenant ID inputs', () => {
    render(<SetupWizard onSkip={() => {}} />)
    expect(screen.getByLabelText(/client id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tenant id/i)).toBeInTheDocument()
  })

  it('shows an error when saving with empty fields', () => {
    render(<SetupWizard onSkip={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/required/i)).toBeInTheDocument()
    expect(bootstrapConfig.writeBootstrapConfig).not.toHaveBeenCalled()
  })

  it('calls writeBootstrapConfig with trimmed values on save', () => {
    render(<SetupWizard onSkip={() => {}} />)
    fireEvent.change(screen.getByLabelText(/client id/i), { target: { value: ' cid ' } })
    fireEvent.change(screen.getByLabelText(/tenant id/i), { target: { value: ' tid ' } })
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
})
