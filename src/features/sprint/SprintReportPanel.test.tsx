import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintReportPanel } from './SprintReportPanel'

describe('SprintReportPanel', () => {
  it('displays HH:MM and decimal for each category', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6.5 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} exportStatus="pending" />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('12:00')).toBeInTheDocument()
    expect(screen.getByText('· 12.00h')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('6:30')).toBeInTheDocument()
    expect(screen.getByText('· 6.50h')).toBeInTheDocument()
  })

  it('displays HH:MM and decimal for total', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} exportStatus="pending" />)
    expect(screen.getByText('18:00')).toBeInTheDocument()
    expect(screen.getByText('· 18.00h')).toBeInTheDocument()
  })

  it('shows zero categories as 0:00 and 0.00h', () => {
    const hours: Record<string, number> = { QA: 5 }
    render(
      <SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra', 'Other']} exportStatus="pending" />,
    )
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getAllByText('5:00')).toHaveLength(2)
    expect(screen.getAllByText('0:00')).toHaveLength(2)
    expect(screen.getAllByText('· 0.00h')).toHaveLength(2)
  })

  it('formats fractional hours correctly in both formats', () => {
    render(<SprintReportPanel hoursPerCategory={{ Dev: 1.75 }} allCategories={['Dev']} exportStatus="pending" />)
    expect(screen.getAllByText('1:45')).toHaveLength(2)
    expect(screen.getAllByText('· 1.75h')).toHaveLength(2)
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
