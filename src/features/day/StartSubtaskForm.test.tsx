import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StartSubtaskForm } from './StartSubtaskForm'

describe('StartSubtaskForm', () => {
  it('focuses the category picker on mount', () => {
    render(<StartSubtaskForm categories={['Work']} defaultCategory="Work" onStart={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveFocus()
  })

  it('calls onStart with the chosen category, started-at time, and trimmed note', async () => {
    const onStart = vi.fn()
    render(
      <StartSubtaskForm
        categories={['Work', 'Meeting']}
        defaultCategory="Work"
        onStart={onStart}
        onCancel={() => {}}
      />,
    )
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Meeting')
    const startedAtInput = screen.getByLabelText('Subtask started at')
    await userEvent.clear(startedAtInput)
    await userEvent.type(startedAtInput, '09:00')
    await userEvent.type(screen.getByLabelText('Subtask note'), '  kickoff  ')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Meeting', startedAt: '09:00', note: 'kickoff', hours: 0 }),
    )
  })

  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = vi.fn()
    render(<StartSubtaskForm categories={['Work']} defaultCategory="Work" onStart={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
