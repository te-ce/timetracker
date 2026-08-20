/** When a trashed item was put there, as the trash list and its rows both spell it. */
export function formatDeletedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}
