import { describe, it, expect } from 'vitest'
import {
  defaultHotkeyConfig,
  getEffectiveShortcut,
  matchesShortcut,
  HOTKEY_DEFAULTS,
  type HotkeyConfig,
  type InAppShortcutAction,
} from './hotkeyConfig'

describe('defaultHotkeyConfig', () => {
  it('returns global toggle as default accelerator', () => {
    const config = defaultHotkeyConfig()
    expect(config.globalToggle).toBe(HOTKEY_DEFAULTS.globalToggle)
  })

  it('returns empty inApp map (all actions use defaults)', () => {
    const config = defaultHotkeyConfig()
    expect(config.inApp).toEqual({})
  })
})

describe('getEffectiveShortcut', () => {
  it('returns default when action not in config', () => {
    const config = defaultHotkeyConfig()
    expect(getEffectiveShortcut(config, 'monthView')).toBe(HOTKEY_DEFAULTS.inApp.monthView)
  })

  it('returns configured value when action is overridden', () => {
    const config: HotkeyConfig = { ...defaultHotkeyConfig(), inApp: { monthView: '1' } }
    expect(getEffectiveShortcut(config, 'monthView')).toBe('1')
  })

  it('returns null when action is explicitly disabled', () => {
    const config: HotkeyConfig = { ...defaultHotkeyConfig(), inApp: { monthView: null } }
    expect(getEffectiveShortcut(config, 'monthView')).toBeNull()
  })

  it('returns null for globalToggle when disabled', () => {
    const config: HotkeyConfig = { ...defaultHotkeyConfig(), globalToggle: null }
    expect(config.globalToggle).toBeNull()
  })

  it('returns configured global accelerator when changed', () => {
    const config: HotkeyConfig = { ...defaultHotkeyConfig(), globalToggle: 'CommandOrControl+Shift+T' }
    expect(config.globalToggle).toBe('CommandOrControl+Shift+T')
  })

  describe('matchesShortcut', () => {
    it('returns true when event key matches default shortcut', () => {
      expect(matchesShortcut(defaultHotkeyConfig(), 'monthView', 'M', false, false)).toBe(true)
      expect(matchesShortcut(defaultHotkeyConfig(), 'monthView', 'm', false, false)).toBe(true)
    })

    it('returns false when action is disabled', () => {
      const config: HotkeyConfig = { ...defaultHotkeyConfig(), inApp: { monthView: null } }
      expect(matchesShortcut(config, 'monthView', 'M', false, false)).toBe(false)
    })

    it('returns true when action is remapped and new key pressed', () => {
      const config: HotkeyConfig = { ...defaultHotkeyConfig(), inApp: { monthView: '1' } }
      expect(matchesShortcut(config, 'monthView', '1', false, false)).toBe(true)
    })

    it('returns false when wrong key pressed', () => {
      expect(matchesShortcut(defaultHotkeyConfig(), 'monthView', 'G', false, false)).toBe(false)
    })

    it('matches undo with ctrl+z', () => {
      expect(matchesShortcut(defaultHotkeyConfig(), 'undo', 'z', true, false)).toBe(true)
    })

    it('matches redo with ctrl+shift+z', () => {
      expect(matchesShortcut(defaultHotkeyConfig(), 'redo', 'z', true, true)).toBe(true)
    })

    it('returns false for undo when undo is disabled', () => {
      const config: HotkeyConfig = { ...defaultHotkeyConfig(), inApp: { undo: null } }
      expect(matchesShortcut(config, 'undo', 'z', true, false)).toBe(false)
    })
  })

  it('covers all defined in-app actions with a default', () => {
    const actions: InAppShortcutAction[] = [
      'monthView',
      'tableView',
      'dayView',
      'sprintView',
      'today',
      'prevDay',
      'nextDay',
      'undo',
      'redo',
      'toggleLegend',
    ]
    const config = defaultHotkeyConfig()
    for (const action of actions) {
      const shortcut = getEffectiveShortcut(config, action)
      expect(shortcut).not.toBeUndefined()
    }
  })
})
