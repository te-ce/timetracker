import { CATEGORIES } from '../repositories/types'

/**
 * Merge fixed categories with user-defined custom categories.
 * Duplicates (custom matching a fixed name) are excluded.
 */
export function getAllCategories(customCategories: string[]): string[] {
  const fixedSet = new Set<string>(CATEGORIES)
  const unique = customCategories.filter((c) => !fixedSet.has(c))
  return [...CATEGORIES, ...unique]
}
