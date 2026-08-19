import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverlapRepairBar } from './OverlapRepairBar'
import { findSubtaskOverlaps } from './overlapRepair'
import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'

function overlapOf(subtasks: WorkPeriodSubtask[]) {
  const period: WorkPeriod = { id: 'p', start: '09:00', end: '17:00', category: 'Work', subtasks }
  const [overlap] = findSubtaskOverlaps(period)
  if (!overlap) throw new Error('fixture has no overlap')
  return overlap
}

const PARTIAL = overlapOf([
  { id: 's1', category: 'Review', hours: 1.5, startedAt: '10:00', stoppedAt: '11:30' },
  { id: 's2', category: 'Meeting', hours: 1.25, startedAt: '11:00', stoppedAt: '12:15' },
])

const CONTAINED = overlapOf([
  { id: 's1', category: 'Review', hours: 1.5, startedAt: '10:00', stoppedAt: '11:30' },
  { id: 's2', category: 'Meeting', hours: 0.5, startedAt: '10:30', stoppedAt: '11:00' },
])

describe('OverlapRepairBar', () => {
  it('names the earlier category and how much time is claimed twice', () => {
    render(<OverlapRepairBar overlap={PARTIAL} onApply={() => {}} />)
    expect(screen.getByText(/Overlaps Review by 0\.50h/)).toBeInTheDocument()
  })

  it('offers each fix with the time it will write', () => {
    render(<OverlapRepairBar overlap={PARTIAL} onApply={() => {}} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'End Review at 11:00',
      'Start Meeting at 11:30',
      'Split at 11:15',
    ])
  })

  it('applies the fix that was clicked', async () => {
    const onApply = vi.fn()
    render(<OverlapRepairBar overlap={PARTIAL} onApply={onApply} />)

    await userEvent.click(screen.getByRole('button', { name: 'Start Meeting at 11:30' }))

    expect(onApply).toHaveBeenCalledWith({ kind: 'delay-later', earlierId: 's1', laterId: 's2', at: '11:30' })
  })

  it('offers the lossless options for a subtask logged inside another', () => {
    render(<OverlapRepairBar overlap={CONTAINED} onApply={() => {}} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Log Meeting as duration only',
      'Delete Meeting',
    ])
  })

  it('uses category descriptions when they lead the display', () => {
    render(
      <OverlapRepairBar
        overlap={PARTIAL}
        categoryDescriptions={{ Review: 'Code review', Meeting: 'Standup' }}
        preferCategoryDescriptionAsPrimary
        onApply={() => {}}
      />,
    )
    expect(screen.getByRole('group', { name: 'Overlap between Code review and Standup' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End Code review at 11:00' })).toBeInTheDocument()
  })
})
