import { DEFAULT_CATEGORIES } from '../infra/repositories/types'

export function isValidCustomCategoryName(name: string): boolean {
  return name.trim().length > 0 && !name.startsWith('_')
}

/**
 * Merge default categories with user-defined custom categories.
 * If categoryOrder is provided, use it as the source of truth (filtering out removed ones).
 * Duplicates (custom matching a default name) are excluded.
 */
export function getAllCategories(customCategories: string[], categoryOrder?: string[]): string[] {
  const defaultSet = new Set<string>(DEFAULT_CATEGORIES)
  const unique = customCategories.filter((c) => !defaultSet.has(c))
  const all = [...DEFAULT_CATEGORIES, ...unique]

  if (categoryOrder && categoryOrder.length > 0) {
    const allSet = new Set(all)
    // Use the persisted order, filtering out categories that no longer exist
    const ordered = categoryOrder.filter((c) => allSet.has(c))
    // Append any new categories not yet in the order
    const orderedSet = new Set(ordered)
    for (const c of all) {
      if (!orderedSet.has(c)) ordered.push(c)
    }
    return ordered
  }

  return all
}
