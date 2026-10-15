function formatSheetDate(isoDate: string): string {
  const parts = isoDate.split('-')
  const year = parts[0] ?? ''
  const month = parts[1] ?? ''
  const day = parts[2] ?? ''
  return `${day}.${month}.${year.slice(2)}`
}

const MAX_SHEET_NAME_LENGTH = 31
const SEPARATOR = ' - '
const FORBIDDEN_SHEET_CHARS = /[:\\/?*[\]]/g

export function buildArchiveSheetName(filename: string | null, start: string, end: string): string {
  const datePart = `${formatSheetDate(start)}${SEPARATOR}${formatSheetDate(end)}`
  if (!filename) return datePart
  const baseName = filename
    .replace(/\.xlsx$/i, '')
    .replace(FORBIDDEN_SHEET_CHARS, '')
    .slice(0, Math.max(0, MAX_SHEET_NAME_LENGTH - datePart.length - SEPARATOR.length))
    .trim()
  return baseName ? `${baseName}${SEPARATOR}${datePart}` : datePart
}
