/**
 * Which controls the header shows and in what order, persisted per browser.
 *
 * Lives apart from the components that read it so the header widgets stay one
 * component per file: the layout is data, not a view.
 */
export const HEADER_ITEM_IDS = [
  'remainingHours',
  'officeStats',
  'sync',
  'timeFormat',
  'undo',
  'shortcuts',
  'theme',
] as const
export type HeaderItemId = (typeof HEADER_ITEM_IDS)[number]

export interface HeaderLayoutState {
  order: HeaderItemId[]
  hidden: HeaderItemId[]
}

export const HEADER_ITEM_LABELS: Record<HeaderItemId, string> = {
  remainingHours: 'Hours',
  officeStats: 'Office stats',
  sync: 'Sync',
  timeFormat: 'Time format',
  undo: 'Undo / Redo',
  shortcuts: 'Shortcuts',
  theme: 'Theme',
}

export function normalizeHeaderLayout(raw: unknown): HeaderLayoutState {
  const valid = new Set<string>(HEADER_ITEM_IDS)
  const obj = typeof raw === 'object' && raw !== null ? raw : {}
  const rawOrder = 'order' in obj && Array.isArray(obj.order) ? obj.order : []
  const rawHidden = 'hidden' in obj && Array.isArray(obj.hidden) ? obj.hidden : []
  const order = rawOrder.filter((id): id is HeaderItemId => typeof id === 'string' && valid.has(id))
  const hidden = rawHidden.filter((id): id is HeaderItemId => typeof id === 'string' && valid.has(id))
  for (const id of HEADER_ITEM_IDS) {
    if (!order.includes(id)) order.push(id)
  }
  return { order, hidden }
}

const HEADER_LAYOUT_STORAGE_KEY = 'header-layout:v1'

export function loadHeaderLayout(): HeaderLayoutState {
  try {
    const raw = localStorage.getItem(HEADER_LAYOUT_STORAGE_KEY)
    if (raw) return normalizeHeaderLayout(JSON.parse(raw))
  } catch {
    /* empty */
  }
  return normalizeHeaderLayout({})
}

export function saveHeaderLayout(state: HeaderLayoutState) {
  localStorage.setItem(HEADER_LAYOUT_STORAGE_KEY, JSON.stringify(state))
}
