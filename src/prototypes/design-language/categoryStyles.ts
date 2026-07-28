// PROTOTYPE — static class maps so Tailwind's JIT scanner can see full class names.
export interface CategoryStyle {
  bg: string
  bgSoft: string
  text: string
  border: string
  dot: string
}

const GRAY: CategoryStyle = {
  bg: 'bg-gray-500',
  bgSoft: 'bg-gray-100 dark:bg-gray-700/60',
  text: 'text-gray-700 dark:text-gray-300',
  border: 'border-gray-300 dark:border-gray-600',
  dot: 'bg-gray-500',
}

const STYLES: Record<string, CategoryStyle> = {
  indigo: {
    bg: 'bg-indigo-500',
    bgSoft: 'bg-indigo-100 dark:bg-indigo-900/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-700',
    dot: 'bg-indigo-500',
  },
  amber: {
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-500',
    bgSoft: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
  },
  sky: {
    bg: 'bg-sky-500',
    bgSoft: 'bg-sky-100 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-700',
    dot: 'bg-sky-500',
  },
  gray: GRAY,
}

export function styleFor(color: string): CategoryStyle {
  return STYLES[color] ?? GRAY
}
