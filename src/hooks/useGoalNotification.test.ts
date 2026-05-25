import { describe, it, expect, beforeEach, vi } from 'vitest'
import { crossedGoal, dispatchGoalNotification } from './useGoalNotification'

describe('crossedGoal', () => {
  it('returns false on first render (no previous value)', () => {
    expect(crossedGoal(null, 0)).toBe(false)
  })

  it('returns false when remaining stays positive', () => {
    expect(crossedGoal(2, 1)).toBe(false)
  })

  it('returns false when previous was already zero', () => {
    expect(crossedGoal(0, 0)).toBe(false)
  })

  it('returns false when previous was negative', () => {
    expect(crossedGoal(-0.5, -1)).toBe(false)
  })

  it('returns true when remaining crosses from positive to exactly zero', () => {
    expect(crossedGoal(0.1, 0)).toBe(true)
  })

  it('returns true when remaining crosses from positive to negative', () => {
    expect(crossedGoal(1.5, -0.1)).toBe(true)
  })
})

describe('dispatchGoalNotification', () => {
  beforeEach(() => {
    delete (window as Window).electronAPI
  })

  it('calls electronAPI.notify.goalReached() in Electron context', () => {
    const goalReached = vi.fn()
    ;(window as Window).electronAPI = {
      autolaunch: { get: () => Promise.resolve(false), set: () => Promise.resolve() },
      tray: { sync: () => {}, onSetCategory: () => {}, offSetCategory: () => {} },
      hotkey: { onToggle: () => {}, offToggle: () => {} },
      storage: {
        get: () => Promise.resolve(null),
        put: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      notify: { goalReached },
    }

    dispatchGoalNotification()

    expect(goalReached).toHaveBeenCalledOnce()
  })

  it('requests browser Notification permission when not in Electron', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    const NotificationSpy = vi.fn()
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(NotificationSpy, { requestPermission }),
      configurable: true,
      writable: true,
    })

    dispatchGoalNotification()
    await Promise.resolve() // flush microtask

    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('creates a Notification when permission is granted', async () => {
    const NotificationSpy = vi.fn()
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(NotificationSpy, {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      }),
      configurable: true,
      writable: true,
    })

    dispatchGoalNotification()
    await Promise.resolve() // flush microtask

    expect(NotificationSpy).toHaveBeenCalledWith('Timetracker', {
      body: "You've reached your daily target!",
    })
  })

  it('does not create a Notification when permission is denied', async () => {
    const NotificationSpy = vi.fn()
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(NotificationSpy, {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      }),
      configurable: true,
      writable: true,
    })

    dispatchGoalNotification()
    await Promise.resolve()

    expect(NotificationSpy).not.toHaveBeenCalled()
  })
})
