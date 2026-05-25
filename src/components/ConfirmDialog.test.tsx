import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    render(
      <ConfirmDialog
        title="Delete item"
        message="Are you sure you want to delete this item?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Delete item' })).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        title="Confirm"
        message="Do it?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="Confirm"
        message="Do it?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="Confirm"
        message="Do it?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders a custom confirmLabel', () => {
    render(
      <ConfirmDialog
        title="Delete"
        message="Really?"
        confirmLabel="Yes, delete"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument()
  })

  it('calls onCancel when Escape key is pressed', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        title="Confirm"
        message="Do it?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Enter key is pressed', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        title="Confirm"
        message="Do it?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    await userEvent.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('renders the dialog with role="dialog" and aria-modal', () => {
    render(
      <ConfirmDialog
        title="Title"
        message="Message"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('applies danger styling class when danger prop is true', () => {
    render(
      <ConfirmDialog
        title="Delete"
        message="Really delete?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: 'Delete' })
    expect(confirmBtn.className).toContain('bg-red-600')
  })

  it('applies indigo styling when danger prop is false (default)', () => {
    render(
      <ConfirmDialog
        title="Save"
        message="Save changes?"
        confirmLabel="Save"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: 'Save' })
    expect(confirmBtn.className).toContain('bg-indigo-600')
  })
})
