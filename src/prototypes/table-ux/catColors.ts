// PROTOTYPE — static class maps so Tailwind's scanner sees full class names.
export interface CatColor {
  bar: string
  chip: string
  text: string
  dot: string
  /** Space-separated RGB channels for `rgb(… / alpha)` heat backgrounds. */
  rgb: string
}

const PALETTE: CatColor[] = [
  {
    bar: 'bg-indigo-500',
    chip: 'bg-indigo-100 dark:bg-indigo-900/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    rgb: '99 102 241',
  },
  {
    bar: 'bg-sky-500',
    chip: 'bg-sky-100 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    rgb: '14 165 233',
  },
  {
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    rgb: '16 185 129',
  },
  {
    bar: 'bg-amber-500',
    chip: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    rgb: '245 158 11',
  },
  {
    bar: 'bg-rose-500',
    chip: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    rgb: '244 63 94',
  },
  {
    bar: 'bg-violet-500',
    chip: 'bg-violet-100 dark:bg-violet-900/40',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500',
    rgb: '139 92 246',
  },
  {
    bar: 'bg-teal-500',
    chip: 'bg-teal-100 dark:bg-teal-900/40',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    rgb: '20 184 166',
  },
  {
    bar: 'bg-orange-500',
    chip: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    rgb: '249 115 22',
  },
]

const FALLBACK: CatColor = {
  bar: 'bg-gray-400',
  chip: 'bg-gray-100 dark:bg-gray-700',
  text: 'text-gray-600 dark:text-gray-300',
  dot: 'bg-gray-400',
  rgb: '156 163 175',
}

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 1000003
  return h
}

// Gray is reserved for unaccounted hours, so every real category gets a hue —
// by position where known, by name hash otherwise.
export function colorForCategory(cat: string, allCategories: string[]): CatColor {
  const idx = allCategories.indexOf(cat)
  const slot = idx >= 0 ? idx : hash(cat)
  return PALETTE[slot % PALETTE.length] ?? FALLBACK
}
