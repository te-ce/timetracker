import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintNavigation } from './SprintNavigation'
import { getSprintBoundaries } from './sprint'

const sprint = getSprintBoundaries(5, { startDate: '2024-01-01', lengthDays: 14 })

describe('SprintNavigation', () => {
  it('shows the sprint number and date range', () => {
    const { container } = render(
      <SprintNavigation sprint={sprint} sprintIndex={null} onSprintIndexChange={vi.fn()} today={sprint.start} />,
    )
    expect(screen.getByText(/sprint 6/i)).toBeInTheDocument()
    expect(container).toHaveTextContent(sprint.start)
    expect(container).toHaveTextContent(sprint.end)
  })

  it('orders left arrow, sprint number, current button, date range, right arrow', () => {
    const { container } = render(
      <SprintNavigation sprint={sprint} sprintIndex={null} onSprintIndexChange={vi.fn()} today={sprint.start} />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveAccessibleName(/previous sprint/i)
    expect(buttons[1]).toHaveAccessibleName(/^current$/i)
    expect(buttons[2]).toHaveAccessibleName(/next sprint/i)

    const text = container.textContent
    const sprintPos = text.indexOf('Sprint 6')
    const currentPos = text.indexOf('Current')
    const datePos = text.indexOf(sprint.start)
    expect(sprintPos).toBeGreaterThanOrEqual(0)
    expect(sprintPos).toBeLessThan(currentPos)
    expect(currentPos).toBeLessThan(datePos)
  })

  it('stretches the full width of its container, like the other view navs', () => {
    const { container } = render(
      <SprintNavigation sprint={sprint} sprintIndex={null} onSprintIndexChange={vi.fn()} today={sprint.start} />,
    )
    expect(container.firstChild).toHaveClass('w-full')
  })

  it('moves to the previous sprint when the previous button is clicked', async () => {
    const onSprintIndexChange = vi.fn()
    render(
      <SprintNavigation
        sprint={sprint}
        sprintIndex={null}
        onSprintIndexChange={onSprintIndexChange}
        today={sprint.start}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))
    expect(onSprintIndexChange).toHaveBeenCalledWith(sprint.index - 1)
  })

  it('moves to the next sprint when the next button is clicked', async () => {
    const onSprintIndexChange = vi.fn()
    render(
      <SprintNavigation
        sprint={sprint}
        sprintIndex={null}
        onSprintIndexChange={onSprintIndexChange}
        today={sprint.start}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /next sprint/i }))
    expect(onSprintIndexChange).toHaveBeenCalledWith(sprint.index + 1)
  })

  it('resets to the current sprint when Current is clicked', async () => {
    const onSprintIndexChange = vi.fn()
    render(
      <SprintNavigation
        sprint={sprint}
        sprintIndex={3}
        onSprintIndexChange={onSprintIndexChange}
        today={sprint.start}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^current$/i }))
    expect(onSprintIndexChange).toHaveBeenCalledWith(null)
  })

  it('marks the Current button disabled when already viewing the current sprint', () => {
    render(<SprintNavigation sprint={sprint} sprintIndex={null} onSprintIndexChange={vi.fn()} today={sprint.start} />)
    expect(screen.getByRole('button', { name: /^current$/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('shows the day-progress tick for each day of the sprint', () => {
    render(<SprintNavigation sprint={sprint} sprintIndex={null} onSprintIndexChange={vi.fn()} today={sprint.start} />)
    expect(screen.getByText(`Day 1 of ${14}`)).toBeInTheDocument()
    expect(screen.getAllByTitle(/^2024-/)).toHaveLength(14)
  })
})
