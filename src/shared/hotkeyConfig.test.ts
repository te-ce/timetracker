import { describe, expect, it } from 'vitest'
import { acceleratorFromKeyEvent, defaultHotkeyConfig, HOTKEY_DEFAULTS } from './hotkeyConfig'

describe('defaultHotkeyConfig', () => {
  it('has no default global hotkeys — a fresh config starts unassigned', () => {
    const config = defaultHotkeyConfig()
    expect(config.globalToggle).toBeNull()
    expect(config.presentingMode).toBeNull()
    expect(HOTKEY_DEFAULTS.globalToggle).toBeNull()
    expect(HOTKEY_DEFAULTS.presentingMode).toBeNull()
  })
})

describe('acceleratorFromKeyEvent', () => {
  it('builds an Electron accelerator from a modified keypress', () => {
    expect(acceleratorFromKeyEvent({ key: 'p', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false })).toBe(
      'CommandOrControl+Shift+P',
    )
  })

  it('builds an accelerator from a plain letter key', () => {
    expect(acceleratorFromKeyEvent({ key: 'm', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe(
      'M',
    )
  })

  it('maps the space key to the Electron "Space" name', () => {
    expect(acceleratorFromKeyEvent({ key: ' ', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe(
      'CommandOrControl+Space',
    )
  })

  it('treats meta and ctrl as the same CommandOrControl modifier', () => {
    expect(acceleratorFromKeyEvent({ key: 'k', ctrlKey: false, metaKey: true, shiftKey: false, altKey: false })).toBe(
      'CommandOrControl+K',
    )
  })

  it('returns null for a bare modifier keypress', () => {
    expect(
      acceleratorFromKeyEvent({ key: 'Control', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }),
    ).toBeNull()
    expect(
      acceleratorFromKeyEvent({ key: 'Shift', ctrlKey: false, metaKey: false, shiftKey: true, altKey: false }),
    ).toBeNull()
  })
})
