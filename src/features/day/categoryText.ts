import { categoryDisplay } from './categoryLabel'
/** What a segment's category reads as, honouring the description-as-primary setting. */
export function categoryText(
  category: string,
  categoryDescriptions: Record<string, string> | undefined,
  preferCategoryDescriptionAsPrimary: boolean | undefined,
): string {
  return categoryDisplay(category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false).primary
}
