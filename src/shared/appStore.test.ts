import { useAppStore } from './appStore'

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({ selectedDate: new Date().toISOString().slice(0, 10) })
  })

  it('initialises selectedDate to today', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(useAppStore.getState().selectedDate).toBe(today)
  })

  it('setSelectedDate updates the date', () => {
    useAppStore.getState().setSelectedDate('2026-01-15')
    expect(useAppStore.getState().selectedDate).toBe('2026-01-15')
  })
})
