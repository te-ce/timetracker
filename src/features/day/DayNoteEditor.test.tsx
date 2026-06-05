import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayNoteEditor } from './DayNoteEditor'

describe('DayNoteEditor', () => {
  it('shows existing note in read mode', () => {
    render(<DayNoteEditor dayNote="Sprint review" onSave={() => {}} />)
    expect(screen.getByText('Sprint review')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/add a note/i)).not.toBeInTheDocument()
  })

  it('shows "Add a note…" placeholder when no note exists', () => {
    render(<DayNoteEditor dayNote={null} onSave={() => {}} />)
    expect(screen.getByText(/add a note/i)).toBeInTheDocument()
  })

  it('opens edit mode when existing note is clicked', async () => {
    render(<DayNoteEditor dayNote="Sprint review" onSave={() => {}} />)
    await userEvent.click(screen.getByText('Sprint review'))
    expect(screen.getByDisplayValue('Sprint review')).toBeInTheDocument()
  })

  it('opens edit mode when placeholder clicked', async () => {
    render(<DayNoteEditor dayNote={null} onSave={() => {}} />)
    await userEvent.click(screen.getByText(/add a note/i))
    expect(screen.getByPlaceholderText(/add a note for this day/i)).toBeInTheDocument()
  })

  it('calls onSave with trimmed note and returns to read mode', async () => {
    const onSave = vi.fn()
    render(<DayNoteEditor dayNote={null} onSave={onSave} />)
    await userEvent.click(screen.getByText(/add a note/i))
    await userEvent.type(screen.getByPlaceholderText(/add a note for this day/i), '  hello  ')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith('hello')
    expect(screen.queryByPlaceholderText(/add a note for this day/i)).not.toBeInTheDocument()
  })

  it('cancel returns to read mode without calling onSave', async () => {
    const onSave = vi.fn()
    render(<DayNoteEditor dayNote="original" onSave={onSave} />)
    await userEvent.click(screen.getByText('original'))
    await userEvent.clear(screen.getByDisplayValue('original'))
    await userEvent.type(screen.getByRole('textbox'), 'changed')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('original')).toBeInTheDocument()
  })

  it('calls onSave with empty string when Clear is clicked', async () => {
    const onSave = vi.fn()
    render(<DayNoteEditor dayNote="Sprint review" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onSave).toHaveBeenCalledWith('')
  })

  it('shows Clear button only in read mode when note exists', () => {
    render(<DayNoteEditor dayNote="Sprint review" onSave={() => {}} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('does not show Clear button when no note exists', () => {
    render(<DayNoteEditor dayNote={null} onSave={() => {}} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('resets to read mode showing new note when dayNote prop changes', async () => {
    const onSave = vi.fn()
    const { rerender } = render(<DayNoteEditor dayNote={null} onSave={onSave} />)

    // Enter edit mode
    await userEvent.click(screen.getByText(/add a note/i))
    expect(screen.getByPlaceholderText(/add a note for this day/i)).toBeInTheDocument()

    // Prop changes (e.g. user navigated to another day)
    rerender(<DayNoteEditor dayNote="Day B note" onSave={onSave} />)

    // Should exit edit mode and show the new note
    expect(screen.queryByPlaceholderText(/add a note for this day/i)).not.toBeInTheDocument()
    expect(screen.getByText('Day B note')).toBeInTheDocument()
  })
})
