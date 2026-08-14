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
  globalToggle: null
  presentingMode: null
  inApp: Record<InAppShortcutAction, string>
} = {
  globalToggle: null,
  presentingMode: null,
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

const ACCELERATOR_MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])

const ACCELERATOR_NAMED_KEYS: Record<string, string> = {
  ' ': 'Space',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  Escape: 'Esc',
}

export interface CapturedKeyEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/**
 * Converts a captured keydown event into an Electron `globalShortcut` accelerator string
 * (e.g. "CommandOrControl+Shift+P"). Returns null for a bare modifier keypress, since a
 * global accelerator needs a non-modifier key to anchor it.
 */
export function acceleratorFromKeyEvent(e: CapturedKeyEvent): string | null {
  if (ACCELERATOR_MODIFIER_KEYS.has(e.key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  parts.push(ACCELERATOR_NAMED_KEYS[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key))

  return parts.join('+')
}
