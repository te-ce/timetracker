import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { NotePopoverPanel } from './NotePopoverPanel'
import type { NotePopoverState } from './NotePopoverPanel'

const state: NotePopoverState = {
  date: '2026-06-04',
  value: 'Initial note',
  top: 100,
  left: 200,
}

function setup(stateOverride: NotePopoverState | null = state) {
  const ref = createRef<HTMLDivElement>()
  const onChange = vi.fn()
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <NotePopoverPanel state={stateOverride} popoverRef={ref} onChange={onChange} onSave={onSave} onClose={onClose} />,
  )
  return { onChange, onSave, onClose }
}

describe('NotePopoverPanel', () => {
  it('renders nothing when state is null', () => {
    setup(null)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders textarea with current value', () => {
    setup()
    expect(screen.getByRole('textbox')).toHaveValue('Initial note')
  })

  it('shows the date in the heading', () => {
    setup()
    expect(screen.getByText(/note for 2026-06-04/i)).toBeInTheDocument()
  })

  it('calls onChange when textarea value changes', async () => {
    const { onChange } = setup()
    await userEvent.type(screen.getByRole('textbox'), 'x')
    expect(onChange).toHaveBeenCalled()
  })

  it('Cancel button calls onClose', async () => {
    const { onClose } = setup()
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Save button calls onSave', async () => {
    const { onSave } = setup()
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('Escape key calls onClose', () => {
    const { onClose } = setup()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Ctrl+Enter calls onSave', () => {
    const { onSave } = setup()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', ctrlKey: true })
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('Meta+Enter calls onSave', () => {
    const { onSave } = setup()
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', metaKey: true })
    expect(onSave).toHaveBeenCalledOnce()
  })
})
