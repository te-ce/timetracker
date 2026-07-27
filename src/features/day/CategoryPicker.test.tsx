import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryPicker } from './CategoryPicker'

describe('CategoryPicker', () => {
  it('lists the given categories plus Uncategorized', () => {
    render(<CategoryPicker value="Work" categories={['Work', 'Meeting']} onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Category' })
    expect(select).toHaveValue('Work')
    expect(screen.getByRole('option', { name: 'Meeting' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Uncategorized' })).toBeInTheDocument()
  })

  it('shows the description next to a category when provided', () => {
    render(
      <CategoryPicker
        value="Work"
        categories={['Work']}
        onChange={() => {}}
        categoryDescriptions={{ Work: 'Daily work' }}
      />,
    )
    expect(screen.getByRole('option', { name: 'Work (Daily work)' })).toBeInTheDocument()
  })

  it('calls onChange with the newly selected category', async () => {
    const onChange = vi.fn()
    render(<CategoryPicker value="Work" categories={['Work', 'Meeting']} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Meeting')
    expect(onChange).toHaveBeenCalledWith('Meeting')
  })

  it('focuses the select on mount when focusOnMount is set', () => {
    render(<CategoryPicker value="Work" categories={['Work']} onChange={() => {}} focusOnMount />)
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveFocus()
  })
})
