import { fireEvent, render, screen } from '@testing-library/react'
import { TrackingBar } from './TrackingBar'
import type { ActiveTracking } from './dayStreamModel'

const active: ActiveTracking = {
  period: { id: 'p1', start: '08:00', end: null, category: 'Work', subtasks: [] },
  category: 'Work',
  subtask: undefined,
  elapsed: 1,
  since: '08:00',
}

describe('TrackingBar', () => {
  it('starts tracking at the live now time by default', () => {
    const onStart = vi.fn()
    render(
      <TrackingBar
        active={undefined}
        now="09:00"
        categories={['Work']}
        defaultCategory="Work"
        isToday
        onStart={onStart}
        onAddPeriod={() => {}}
        onStop={() => {}}
        onStartSubtask={() => {}}
        onStopSubtask={() => {}}
      />,
    )
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00')
    fireEvent.click(screen.getByRole('button', { name: /start tracking/i }))
    expect(onStart).toHaveBeenCalledWith('Work', '09:00')
  })

  it('starts tracking at an overridden time, and the field stops following now', () => {
    const onStart = vi.fn()
    render(
      <TrackingBar
        active={undefined}
        now="09:00"
        categories={['Work']}
        defaultCategory="Work"
        isToday
        onStart={onStart}
        onAddPeriod={() => {}}
        onStop={() => {}}
        onStartSubtask={() => {}}
        onStopSubtask={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '08:15' } })
    expect(screen.getByRole('button', { name: 'Reset to now' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /start tracking/i }))
    expect(onStart).toHaveBeenCalledWith('Work', '08:15')
  })

  it('stops tracking at the live now time by default', () => {
    const onStop = vi.fn()
    render(
      <TrackingBar
        active={active}
        now="10:30"
        categories={['Work']}
        defaultCategory="Work"
        isToday
        onStart={() => {}}
        onAddPeriod={() => {}}
        onStop={onStop}
        onStartSubtask={() => {}}
        onStopSubtask={() => {}}
      />,
    )
    expect(screen.getByLabelText('Time')).toHaveValue('10:30')
    fireEvent.click(screen.getByRole('button', { name: /stop work/i }))
    expect(onStop).toHaveBeenCalledWith('10:30')
  })

  it('stops tracking at an overridden time', () => {
    const onStop = vi.fn()
    render(
      <TrackingBar
        active={active}
        now="10:30"
        categories={['Work']}
        defaultCategory="Work"
        isToday
        onStart={() => {}}
        onAddPeriod={() => {}}
        onStop={onStop}
        onStartSubtask={() => {}}
        onStopSubtask={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:45' } })
    fireEvent.click(screen.getByRole('button', { name: /stop work/i }))
    expect(onStop).toHaveBeenCalledWith('10:45')
  })

  it('starts a subtask at an overridden time', () => {
    const onStartSubtask = vi.fn()
    render(
      <TrackingBar
        active={active}
        now="10:30"
        categories={['Work', 'Meeting']}
        defaultCategory="Work"
        isToday
        onStart={() => {}}
        onAddPeriod={() => {}}
        onStop={() => {}}
        onStartSubtask={onStartSubtask}
        onStopSubtask={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:20' } })
    fireEvent.click(screen.getByRole('button', { name: /start subtask/i }))
    expect(onStartSubtask).toHaveBeenCalledWith('Work', '10:20')
  })

  it('stops a subtask at an overridden time', () => {
    const onStopSubtask = vi.fn()
    const activeWithSubtask: ActiveTracking = {
      ...active,
      subtask: { id: 's1', category: 'Meeting', hours: 0, startedAt: '10:00' },
    }
    render(
      <TrackingBar
        active={activeWithSubtask}
        now="10:30"
        categories={['Work', 'Meeting']}
        defaultCategory="Work"
        isToday
        onStart={() => {}}
        onAddPeriod={() => {}}
        onStop={() => {}}
        onStartSubtask={() => {}}
        onStopSubtask={onStopSubtask}
      />,
    )
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '10:25' } })
    fireEvent.click(screen.getByRole('button', { name: /stop subtask/i }))
    expect(onStopSubtask).toHaveBeenCalledWith('10:25')
  })
})
