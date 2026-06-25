function formatSheetDate(isoDate: string): string {
  const parts = isoDate.split('-')
  const year = parts[0] ?? ''
  const month = parts[1] ?? ''
  const day = parts[2] ?? ''
  return `${day}.${month}.${year.slice(2)}`
}

export function buildArchiveSheetName(filename: string | null, start: string, end: string): string {
  const datePart = `${formatSheetDate(start)} - ${formatSheetDate(end)}`
  if (!filename) return datePart.slice(0, 31)
  const baseName = filename.replace(/\.xlsx$/i, '')
  return `${baseName} - ${datePart}`.slice(0, 31)
}
