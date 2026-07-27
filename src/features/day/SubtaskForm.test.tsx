import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubtaskForm } from './SubtaskForm'

describe('SubtaskForm', () => {
  it('focuses the duration input on mount', () => {
    render(<SubtaskForm categories={['Work']} onAdd={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('Subtask duration')).toHaveFocus()
  })

  it('does not call onAdd when the duration is invalid', async () => {
    const onAdd = vi.fn()
    render(<SubtaskForm categories={['Work']} onAdd={onAdd} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onAdd with the parsed duration, category, and trimmed note', async () => {
    const onAdd = vi.fn()
    render(<SubtaskForm categories={['Work', 'Meeting']} onAdd={onAdd} onCancel={() => {}} />)
    await userEvent.type(screen.getByLabelText('Subtask duration'), '1.5')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Meeting')
    await userEvent.type(screen.getByLabelText('Subtask note'), '  did a thing  ')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Meeting', hours: 1.5, note: 'did a thing' }),
    )
  })

  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = vi.fn()
    render(<SubtaskForm categories={['Work']} onAdd={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows a category description when provided', async () => {
    render(
      <SubtaskForm
        categories={['Work']}
        onAdd={() => {}}
        onCancel={() => {}}
        categoryDescriptions={{ Work: 'Daily work' }}
      />,
    )
    expect(screen.getByText('(Daily work)')).toBeInTheDocument()
  })
})
