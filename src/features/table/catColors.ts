export interface CatColor {
  text: string
}

const PALETTE: CatColor[] = [
  { text: 'text-indigo-700 dark:text-indigo-300' },
  { text: 'text-sky-700 dark:text-sky-300' },
  { text: 'text-emerald-700 dark:text-emerald-300' },
  { text: 'text-amber-700 dark:text-amber-300' },
  { text: 'text-rose-700 dark:text-rose-300' },
  { text: 'text-violet-700 dark:text-violet-300' },
  { text: 'text-teal-700 dark:text-teal-300' },
  { text: 'text-orange-700 dark:text-orange-300' },
]

const FALLBACK: CatColor = { text: 'text-gray-600 dark:text-gray-300' }

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 1000003
  return h
}

// Every real category gets a stable hue — by position in the list where known, by name hash otherwise.
export function colorForCategory(cat: string, allCategories: string[]): CatColor {
  const idx = allCategories.indexOf(cat)
  const slot = idx >= 0 ? idx : hash(cat)
  return PALETTE[slot % PALETTE.length] ?? FALLBACK
}
