/** How a category name is spelled in the table's column header and its tooltip. */
export function displayCategoryName(cat: string): string {
  return cat.replace(/^_/, '')
}
