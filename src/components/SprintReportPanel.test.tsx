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
    render(
      <SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra', 'Other']} exportStatus="pending" />,
    )
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

  it('shows Export to SharePoint button when pending and onExport provided', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByRole('button', { name: /export to sharepoint/i })).toBeInTheDocument()
  })

  it('calls onExport when button clicked', async () => {
    const onExport = vi.fn().mockResolvedValue(undefined)
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady
        onExport={onExport}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /export to sharepoint/i }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('disables export button when exportReady is false', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady={false}
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByRole('button', { name: /export to sharepoint/i })).toBeDisabled()
  })

  it('hides export button when already exported', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="exported"
        exportReady
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.queryByRole('button', { name: /export to sharepoint/i })).not.toBeInTheDocument()
  })

  it('shows error message when export fails', async () => {
    const onExport = vi.fn().mockRejectedValue(new Error('Network error'))
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady
        onExport={onExport}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /export to sharepoint/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
  })
})
