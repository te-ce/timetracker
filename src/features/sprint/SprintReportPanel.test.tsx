import { render, screen } from '@testing-library/react'
import { SprintReportPanel } from './SprintReportPanel'

describe('SprintReportPanel', () => {
  it('displays HH:MM and decimal for each category', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6.5 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('12.00h')).toBeInTheDocument()
    expect(screen.getByText('6:30')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('6.50h')).toBeInTheDocument()
  })

  it('displays HH:MM and decimal for total', () => {
    const hours: Record<string, number> = { QA: 12, Infra: 6 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra']} />)
    expect(screen.getByText(/total/i)).toBeInTheDocument()
    expect(screen.getByText('18.00h')).toBeInTheDocument()
    expect(screen.getByText('18:00')).toBeInTheDocument()
  })

  it('shows zero categories as 0:00 and 0.00h', () => {
    const hours: Record<string, number> = { QA: 5 }
    render(<SprintReportPanel hoursPerCategory={hours} allCategories={['QA', 'Infra', 'Other']} />)
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('Infra')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getAllByText('5.00h')).toHaveLength(2)
    expect(screen.getAllByText('0.00h')).toHaveLength(2)
  })

  it('shows the description as the primary label when preferCategoryDescriptionAsPrimary is set', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 3 }}
        allCategories={['QA']}
        categoryDescriptions={{ QA: 'Quality assurance' }}
        preferCategoryDescriptionAsPrimary
      />,
    )
    expect(screen.getByText('Quality assurance')).toBeInTheDocument()
    expect(screen.getByText('QA')).toBeInTheDocument()
  })

  it('keeps the category name primary when the preference is off', () => {
    render(
      <SprintReportPanel
        hoursPerCategory={{ QA: 3 }}
        allCategories={['QA']}
        categoryDescriptions={{ QA: 'Quality assurance' }}
      />,
    )
    expect(screen.getByText('QA')).toBeInTheDocument()
    expect(screen.getByText('Quality assurance')).toBeInTheDocument()
  })

  it('formats fractional hours correctly in both formats', () => {
    render(<SprintReportPanel hoursPerCategory={{ Dev: 1.75 }} allCategories={['Dev']} />)
    expect(screen.getAllByText('1.75h')).toHaveLength(2)
    expect(screen.getAllByText('1:45')).toHaveLength(2)
  })
})
