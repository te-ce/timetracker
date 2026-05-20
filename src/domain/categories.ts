import { DEFAULT_CATEGORIES } from '../repositories/types'

/**
 * Merge default categories with user-defined custom categories.
 * Duplicates (custom matching a default name) are excluded.
 */
export function getAllCategories(customCategories: string[]): string[] {
  const defaultSet = new Set<string>(DEFAULT_CATEGORIES)
  const unique = customCategories.filter((c) => !defaultSet.has(c))
  return [...DEFAULT_CATEGORIES, ...unique]
}
