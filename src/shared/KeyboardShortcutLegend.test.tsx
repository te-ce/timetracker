import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KeyboardShortcutLegend } from './KeyboardShortcutLegend'

describe('KeyboardShortcutLegend', () => {
  it('renders the dialog with keyboard shortcuts heading', () => {
    render(<KeyboardShortcutLegend onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument()
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument()
  })

  it('lists all shortcut descriptions', () => {
    render(<KeyboardShortcutLegend onClose={() => {}} />)
    expect(screen.getByText(/go to month view/i)).toBeInTheDocument()
    expect(screen.getByText(/go to table view/i)).toBeInTheDocument()
    expect(screen.getByText(/jump to today/i)).toBeInTheDocument()
    expect(screen.getByText(/undo last change/i)).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutLegend onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutLegend onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when clicking outside the dialog panel', async () => {
    const onClose = vi.fn()
    const { baseElement } = render(<KeyboardShortcutLegend onClose={onClose} />)
    // Click the backdrop overlay (the fixed inset-0 div behind the panel)
    const overlay = baseElement.querySelector('.fixed.inset-0')
    if (!overlay) throw new Error('Overlay not found')
    await userEvent.click(overlay)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders kbd elements for shortcut keys', () => {
    render(<KeyboardShortcutLegend onClose={() => {}} />)
    // The SHORTCUTS list includes single-character keys like 'M' and 'Esc'
    const kbds = document.querySelectorAll('kbd')
    expect(kbds.length).toBeGreaterThan(0)
    const kbdTexts = Array.from(kbds).map((k) => k.textContent)
    expect(kbdTexts).toContain('M')
    expect(kbdTexts).toContain('Esc')
  })
})
