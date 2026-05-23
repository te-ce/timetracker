export type Bundesland =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH'

export const BUNDESLAENDER: { code: Bundesland; name: string }[] = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
]

export interface PublicHoliday {
  date: string // ISO e.g. "2026-01-01"
  name: string
}

export type HolidayApiResponse = Record<string, { datum: string; hinweis: string }>

/**
 * Fetch public holidays from feiertage-api.de for a given state and year.
 */
export async function fetchHolidays(state: Bundesland, year: number): Promise<PublicHoliday[]> {
  const res = await fetch(`https://feiertage-api.de/api/?jahr=${year}&nur_land=${state}`)
  if (!res.ok) return []
  const data = (await res.json()) as unknown as HolidayApiResponse
  return Object.entries(data).map(([name, info]) => ({
    date: info.datum,
    name,
  }))
}

/**
 * Check if a given ISO date string is a public holiday.
 */
export function isPublicHoliday(date: string, holidays: PublicHoliday[]): boolean {
  return holidays.some((h) => h.date === date)
}
