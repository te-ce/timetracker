import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SubtaskEditForm, resolveSubtaskEdit } from './SubtaskEditForm'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthRepository, WorkPeriodSubtask } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

describe('resolveSubtaskEdit', () => {
  const sl: WorkPeriodSubtask = { id: 'sl-1', category: 'Work', hours: 1 }

  it('computes hours from start/end in timed submode', () => {
    const { subtask, valid } = resolveSubtaskEdit(sl, 'Meeting', undefined, '09:00', '10:30', '', 'timed')
    expect(valid).toBe(true)
    expect(subtask).toMatchObject({ category: 'Meeting', hours: 1.5, startedAt: '09:00', stoppedAt: '10:30' })
  })

  it('is invalid when the timed range is zero', () => {
    const { valid } = resolveSubtaskEdit(sl, 'Meeting', undefined, '09:00', '09:00', '', 'timed')
    expect(valid).toBe(false)
  })

  it('parses hours from the raw string in decimal submode and clears timed fields', () => {
    const { subtask, valid } = resolveSubtaskEdit(sl, 'Meeting', 'note', '09:00', '10:30', '2.5', 'decimal')
    expect(valid).toBe(true)
    expect(subtask).toMatchObject({
      category: 'Meeting',
      hours: 2.5,
      startedAt: undefined,
      stoppedAt: undefined,
      note: 'note',
    })
  })

  it('is invalid when the decimal hours are zero or unparsable', () => {
    expect(resolveSubtaskEdit(sl, 'Meeting', undefined, '', '', '0', 'decimal').valid).toBe(false)
    expect(resolveSubtaskEdit(sl, 'Meeting', undefined, '', '', 'nope', 'decimal').valid).toBe(false)
  })

  it('keeps a live subtask running when the end is left blank in timed submode', () => {
    const { subtask, valid } = resolveSubtaskEdit(sl, 'Meeting', undefined, '09:15', '', '', 'timed')
    expect(valid).toBe(true)
    expect(subtask).toMatchObject({ category: 'Meeting', startedAt: '09:15', stoppedAt: undefined, hours: sl.hours })
  })

  it('is invalid in timed submode when both start and end are blank', () => {
    expect(resolveSubtaskEdit(sl, 'Meeting', undefined, '', '', '', 'timed').valid).toBe(false)
  })
})

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6
const PERIOD_ID = 'p1'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeRepo(sl: WorkPeriodSubtask) {
  return new InMemoryMonthRepository({
    '2026-06': {
      [DATE]: { windows: [{ id: PERIOD_ID, start: '09:00', end: '11:00', category: 'Work', subtasks: [sl] }] },
    },
  })
}

function Harness({ repo, sl, onDone }: { repo: MonthRepository; sl: WorkPeriodSubtask; onDone: () => void }) {
  const mutations = useWorkPeriodMutations(repo)
  return (
    <SubtaskEditForm
      sl={sl}
      periodId={PERIOD_ID}
      date={DATE}
      categories={['Work', 'Meeting']}
      stripeBg=""
      mutations={mutations}
      onDone={onDone}
    />
  )
}

describe('SubtaskEditForm', () => {
  it('saves a decimal-hours edit via addSubtask and calls onDone', async () => {
    const sl: WorkPeriodSubtask = { id: 'sl-1', category: 'Work', hours: 1, startedAt: undefined, stoppedAt: undefined }
    const repo = makeRepo(sl)
    const onDone = vi.fn()
    render(<Harness repo={repo} sl={sl} onDone={onDone} />, { wrapper })

    const hoursInput = screen.getByLabelText('Subtask hours')
    await userEvent.clear(hoursInput)
    await userEvent.type(hoursInput, '2')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onDone).toHaveBeenCalled()
    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks[0]).toMatchObject({ hours: 2 })
  })

  it('shows start/end time fields (not just duration) for an active live subtask', async () => {
    const sl: WorkPeriodSubtask = { id: 'sl-1', category: 'Work', hours: 0, startedAt: '09:15', stoppedAt: undefined }
    const repo = makeRepo(sl)
    render(<Harness repo={repo} sl={sl} onDone={vi.fn()} />, { wrapper })

    expect(screen.getByLabelText('Subtask start time')).toHaveValue('09:15')
    expect(screen.getByLabelText('Subtask end time')).toHaveValue('')
    expect(screen.queryByLabelText('Subtask hours')).not.toBeInTheDocument()
  })

  it('saving a live subtask with the end left blank keeps it running', async () => {
    const sl: WorkPeriodSubtask = { id: 'sl-1', category: 'Work', hours: 0, startedAt: '09:15', stoppedAt: undefined }
    const repo = makeRepo(sl)
    const onDone = vi.fn()
    render(<Harness repo={repo} sl={sl} onDone={onDone} />, { wrapper })

    const startInput = screen.getByLabelText('Subtask start time')
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '09:30')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onDone).toHaveBeenCalled()
    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks[0]).toMatchObject({ startedAt: '09:30', stoppedAt: undefined })
  })

  it('calls onDone without saving when Cancel is clicked', async () => {
    const sl: WorkPeriodSubtask = { id: 'sl-1', category: 'Work', hours: 1 }
    const repo = makeRepo(sl)
    const onDone = vi.fn()
    render(<Harness repo={repo} sl={sl} onDone={onDone} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDone).toHaveBeenCalled()
    const data = await repo.getMonth(YEAR, MONTH)
    expect(data[DATE]?.windows[0]?.subtasks[0]).toMatchObject({ hours: 1 })
  })
})
