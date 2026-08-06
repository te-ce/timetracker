import { describe, expect, it } from 'vitest'
import { defaultHotkeyConfig, HOTKEY_DEFAULTS } from './hotkeyConfig'

describe('defaultHotkeyConfig', () => {
  it('includes a default presenting-mode global hotkey', () => {
    const config = defaultHotkeyConfig()
    expect(config.presentingMode).toBe('CommandOrControl+Shift+P')
    expect(HOTKEY_DEFAULTS.presentingMode).toBe('CommandOrControl+Shift+P')
  })
})
