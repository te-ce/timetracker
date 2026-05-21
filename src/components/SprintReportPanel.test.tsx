import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintReportPanel } from './SprintReportPanel'

describe('SprintReportPanel', () => {
  it('displays hours per category for the sprint', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} exportStatus="pending" />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('12h')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('6h')).toBeInTheDocument()
  })

  it('shows all categories even with zero hours', () => {
    const hours: Record<string, number> = { QA: 5 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra', 'Other']} exportStatus="pending" />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByText('5h')).toBeInTheDocument()
    expect(screen.getAllByText('0h')).toHaveLength(2)
  })

  it('shows ExportStatus badge', () => {
    render(<SprintReportPanel hoursPerCategory={{ QA: 5 }} allCategories={['QA']} exportStatus="exported" />)
    expect(screen.getByText(/exported/i)).toBeInTheDocument()
  })

  it('shows Mark as Exported button when pending', () => {
    const onExport = vi.fn()
    render(<SprintReportPanel hoursPerCategory={{ QA: 5 }} allCategories={['QA']} exportStatus="pending" onMarkExported={onExport} />)
    expect(screen.getByRole('button', { name: /mark as exported/i })).toBeInTheDocument()
  })

  it('calls onMarkExported when button clicked', async () => {
    const onExport = vi.fn()
    render(<SprintReportPanel hoursPerCategory={{ QA: 5 }} allCategories={['QA']} exportStatus="pending" onMarkExported={onExport} />)
    await userEvent.click(screen.getByRole('button', { name: /mark as exported/i }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('hides export button when already exported', () => {
    const onExport = vi.fn()
    render(<SprintReportPanel hoursPerCategory={{ QA: 5 }} allCategories={['QA']} exportStatus="exported" onMarkExported={onExport} />)
    expect(screen.queryByRole('button', { name: /mark as exported/i })).not.toBeInTheDocument()
  })
})
