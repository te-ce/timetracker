import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'

/** Display name for a category, keeping the UNCATEGORIZED_CATEGORY sentinel readable. */
export function categoryLabel(category: string): string {
  return category === UNCATEGORIZED_CATEGORY ? 'Uncategorized' : category
}

export interface CategoryDisplay {
  primary: string
  secondary: string | undefined
}

/**
 * Primary/secondary text for a category. When `preferDescription` is set and
 * a description exists, the description leads and the name becomes the
 * fallback; otherwise the name leads and the description (if any) is the
 * secondary text.
 */
export function categoryDisplay(
  category: string,
  categoryDescriptions: Record<string, string>,
  preferDescription: boolean,
): CategoryDisplay {
  const name = categoryLabel(category)
  const description = categoryDescriptions[category]
  if (preferDescription && description) {
    return { primary: description, secondary: name }
  }
  return { primary: name, secondary: description }
}
