import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'

/** Display name for a category, keeping the UNCATEGORIZED_CATEGORY sentinel readable. */
export function categoryLabel(category: string): string {
  return category === UNCATEGORIZED_CATEGORY ? 'Uncategorized' : category
}
