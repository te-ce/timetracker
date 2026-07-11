import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintReportPanel } from './SprintReportPanel'
import { SheetExistsError } from '../excel'

describe('SprintReportPanel', () => {
  it('displays HH:MM and decimal for each category', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6.5 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} exportStatus="pending" />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('12.00h')).toBeInTheDocument()
    expect(screen.getByText('· 12:00')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('6.50h')).toBeInTheDocument()
    expect(screen.getByText('· 6:30')).toBeInTheDocument()
  })

  it('displays HH:MM and decimal for total', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} exportStatus="pending" />)
    expect(screen.getByText('18.00h')).toBeInTheDocument()
    expect(screen.getByText('· 18:00')).toBeInTheDocument()
  })

  it('shows zero categories as 0:00 and 0.00h', () => {
    const hours: Record<string, number> = { QA: 5 }
    render(
      <SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra', 'Other']} exportStatus="pending" />,
    )
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getAllByText('5.00h')).toHaveLength(2)
    expect(screen.getAllByText('0.00h')).toHaveLength(2)
    expect(screen.getAllByText('· 0:00')).toHaveLength(2)
  })

  it('formats fractional hours correctly in both formats', () => {
    render(<SprintReportPanel hoursPerCategory={{ Dev: 1.75 }} allCategories={['Dev']} exportStatus="pending" />)
    expect(screen.getAllByText('1.75h')).toHaveLength(2)
    expect(screen.getAllByText('· 1:45')).toHaveLength(2)
  })

  it('shows ExportStatus badge', () => {
    render(<SprintReportPanel hoursPerCategory={{ QA: 5 }} allCategories={['QA']} exportStatus="exported" />)
    expect(screen.getByText(/exported/i)).toBeInTheDocument()
  })

  it('shows Export button when onExport provided', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: /^export$/i }))
    expect(onExport).toHaveBeenCalledOnce()
  })

  it('keeps export button enabled even when exportReady is false', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady={false}
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByRole('button', { name: /^export$/i })).toBeEnabled()
  })

  it('shows export button even when already exported (allows re-export)', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="exported"
        exportReady
        onExport={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: /^export$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
  })

  it('switches to "Export and overwrite" when the archive sheet already exists, then re-exports with overwrite', async () => {
    const onExport = vi
      .fn<(overwrite: boolean) => Promise<void>>()
      .mockRejectedValueOnce(new SheetExistsError('Sprint 3'))
      .mockResolvedValueOnce(undefined)
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 5 }}
        allCategories={['QA']}
        exportStatus="pending"
        exportReady
        onExport={onExport}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^export$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Worksheet "Sprint 3" already exists')
    expect(onExport).toHaveBeenNthCalledWith(1, false)

    const confirmBtn = screen.getByRole('button', { name: /export and overwrite/i })
    await userEvent.click(confirmBtn)
    expect(onExport).toHaveBeenNthCalledWith(2, true)

    // On success the confirm state clears back to a plain Export button
    expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /export and overwrite/i })).not.toBeInTheDocument()
  })
})
