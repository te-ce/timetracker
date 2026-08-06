export type InAppShortcutAction =
  | 'monthView'
  | 'tableView'
  | 'dayView'
  | 'sprintView'
  | 'today'
  | 'prevDay'
  | 'nextDay'
  | 'undo'
  | 'redo'
  | 'toggleLegend'

export interface HotkeyConfig {
  globalToggle: string | null
  presentingMode: string | null
  inApp: Partial<Record<InAppShortcutAction, string | null>>
}

export const HOTKEY_DEFAULTS: {
  globalToggle: string
  presentingMode: string
  inApp: Record<InAppShortcutAction, string>
} = {
  globalToggle: 'CommandOrControl+Shift+Space',
  presentingMode: 'CommandOrControl+Shift+P',
  inApp: {
    monthView: 'M',
    tableView: 'G',
    dayView: 'D',
    sprintView: 'S',
    today: 'T',
    prevDay: 'ArrowLeft',
    nextDay: 'ArrowRight',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Shift+Z',
    toggleLegend: '?',
  },
}

export function defaultHotkeyConfig(): HotkeyConfig {
  return { globalToggle: HOTKEY_DEFAULTS.globalToggle, presentingMode: HOTKEY_DEFAULTS.presentingMode, inApp: {} }
}

export function matchesShortcut(
  config: HotkeyConfig,
  action: InAppShortcutAction,
  key: string,
  ctrl: boolean,
  shift: boolean,
): boolean {
  const effective = getEffectiveShortcut(config, action)
  if (effective === null) return false

  const parts = effective.split('+')
  const needsCtrl = parts.includes('Ctrl')
  const needsShift = parts.includes('Shift')
  const keyPart = parts[parts.length - 1] ?? ''

  if (needsCtrl !== ctrl || needsShift !== shift) return false
  return key.toLowerCase() === keyPart.toLowerCase()
}

export function getEffectiveShortcut(config: HotkeyConfig, action: InAppShortcutAction): string | null {
  if (action in config.inApp) {
    return config.inApp[action] ?? null
  }
  return HOTKEY_DEFAULTS.inApp[action]
}
