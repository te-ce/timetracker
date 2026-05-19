import { render, screen } from '@testing-library/react'
import { SprintReportPanel } from './SprintReportPanel'
import type { Category } from '../repositories/types'

describe('SprintReportPanel', () => {
  it('displays hours per category for the sprint', () => {
    const hours: Partial<Record<Category, number>> = { QA: 12, Infra: 6 }
    render(<SprintReportPanel hoursPerCategory={hours} exportStatus="pending" />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('12h')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('6h')).toBeInTheDocument()
  })

  it('shows ExportStatus badge', () => {
    const hours: Partial<Record<Category, number>> = { QA: 5 }
    render(<SprintReportPanel hoursPerCategory={hours} exportStatus="exported" />)
    expect(screen.getByText(/exported/i)).toBeInTheDocument()
  })

  it('shows a zero state when no entries exist', () => {
    render(<SprintReportPanel hoursPerCategory={{}} exportStatus="pending" />)
    expect(screen.getByText(/no time entries/i)).toBeInTheDocument()
  })
})
