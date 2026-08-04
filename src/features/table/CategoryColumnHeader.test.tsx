import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { CategoryColumnHeader } from './CategoryColumnHeader'
import type { CategoryColumnHeaderProps } from './CategoryColumnHeader'

function setup(overrides: Partial<CategoryColumnHeaderProps> = {}) {
  const defaults: CategoryColumnHeaderProps = {
    cat: '_SUPPORT',
    catIdx: 0,
    allCategories: ['_SUPPORT'],
    autoCategory: '_COREMEDIA',
    editingCat: null,
    editValue: '',
    colDragOverIdx: null,
    dragHandlers: {
      onDragStart: vi.fn(),
      onDragOver: vi.fn(),
      onDrop: vi.fn(),
      onDragEnd: vi.fn(),
    },
    onEditValueChange: vi.fn(),
    onCommitRename: vi.fn(),
    onSetEditingCat: vi.fn(),
  }
  render(
    <table>
      <thead>
        <tr>
          <CategoryColumnHeader {...defaults} {...overrides} />
        </tr>
      </thead>
    </table>,
  )
}

describe('CategoryColumnHeader', () => {
  describe('rendering', () => {
    it('renders category name as column header', () => {
      setup()
      expect(screen.getByRole('columnheader')).toBeInTheDocument()
      expect(screen.getByText('SUPPORT')).toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('does not show tooltip initially', () => {
      setup()
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows tooltip with category name on hover', () => {
      setup()
      fireEvent.mouseEnter(screen.getByText('SUPPORT'))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByRole('tooltip')).toHaveTextContent('SUPPORT')
    })

    it('shows description in tooltip when categoryDescriptions has entry', () => {
      setup({ categoryDescriptions: { _SUPPORT: 'Customer support tasks' } })
      fireEvent.mouseEnter(screen.getByText('SUPPORT'))
      expect(screen.getByRole('tooltip')).toHaveTextContent('Customer support tasks')
    })

    it('shows both category name and description in tooltip', () => {
      setup({ categoryDescriptions: { _SUPPORT: 'Customer support tasks' } })
      fireEvent.mouseEnter(screen.getByText('SUPPORT'))
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('SUPPORT')
      expect(tooltip).toHaveTextContent('Customer support tasks')
    })

    it('shows auto-category note in tooltip for auto category', () => {
      setup({ cat: '_COREMEDIA', autoCategory: '_COREMEDIA' })
      fireEvent.mouseEnter(screen.getByText('COREMEDIA'))
      expect(screen.getByRole('tooltip')).toHaveTextContent('auto category')
    })

    it('shows "Double-click to rename" hint in tooltip when onCategoryRename is provided', () => {
      setup({ onCategoryRename: vi.fn() })
      fireEvent.mouseEnter(screen.getByText('SUPPORT'))
      expect(screen.getByRole('tooltip')).toHaveTextContent('Double-click to rename')
    })

    it('does not show rename hint when onCategoryRename is not provided', () => {
      setup()
      fireEvent.mouseEnter(screen.getByText('SUPPORT'))
      expect(screen.getByRole('tooltip')).not.toHaveTextContent('Double-click to rename')
    })

    it('hides tooltip on mouseleave', () => {
      setup()
      const nameSpan = screen.getByText('SUPPORT')
      fireEvent.mouseEnter(nameSpan)
      fireEvent.mouseLeave(nameSpan)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('does not show tooltip while editing (input visible)', () => {
      setup({ editingCat: '_SUPPORT' })
      const input = screen.getByRole('textbox')
      fireEvent.mouseEnter(input)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })
})
