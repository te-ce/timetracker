import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddPeriodForm } from './AddPeriodForm'

describe('AddPeriodForm', () => {
  it('labels the submit button "Start tracking" when no end time is set', () => {
    render(<AddPeriodForm openPeriod={null} defaultCategory="Work" categories={['Work']} onAdd={() => {}} />)
    expect(screen.getByRole('button', { name: 'Start tracking' })).toBeInTheDocument()
  })

  it('labels the submit button "Add period" once an end time is entered', async () => {
    render(<AddPeriodForm openPeriod={null} defaultCategory="Work" categories={['Work']} onAdd={() => {}} />)
    await userEvent.type(screen.getByLabelText('End'), '17:00')
    expect(screen.getByRole('button', { name: 'Add period' })).toBeInTheDocument()
  })

  it('disables submit for a live (no end) period when one is already open', () => {
    const openPeriod = { id: 'open-1', start: '09:00', end: null, category: 'Work', subtasks: [] }
    render(<AddPeriodForm openPeriod={openPeriod} defaultCategory="Work" categories={['Work']} onAdd={() => {}} />)
    expect(screen.getByRole('button', { name: 'Start tracking' })).toBeDisabled()
  })

  it('calls onAdd with the entered end time and category, then resets the form', async () => {
    const onAdd = vi.fn()
    render(<AddPeriodForm openPeriod={null} defaultCategory="Work" categories={['Work', 'Meeting']} onAdd={onAdd} />)
    await userEvent.type(screen.getByLabelText('End'), '17:00')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Meeting')
    await userEvent.click(screen.getByRole('button', { name: 'Add period' }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ end: '17:00', category: 'Meeting', subtasks: [] }))
    expect(screen.getByLabelText('End')).toHaveValue('')
  })

  it('resets the category back to defaultCategory when it changes', async () => {
    const { rerender } = render(
      <AddPeriodForm openPeriod={null} defaultCategory="Work" categories={['Work', 'Meeting']} onAdd={() => {}} />,
    )
    rerender(
      <AddPeriodForm openPeriod={null} defaultCategory="Meeting" categories={['Work', 'Meeting']} onAdd={() => {}} />,
    )
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('Meeting')
  })
})
