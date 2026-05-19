import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { fetchHolidays, isPublicHoliday } from './holidays'
import type { PublicHoliday } from './holidays'

const mockResponse = {
  Neujahrstag: { datum: '2026-01-01', hinweis: '' },
  'Tag der Arbeit': { datum: '2026-05-01', hinweis: '' },
  'Tag der Deutschen Einheit': { datum: '2026-10-03', hinweis: '' },
}

const server = setupServer(
  http.get('https://feiertage-api.de/api/', () => {
    return HttpResponse.json(mockResponse)
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchHolidays', () => {
  it('parses API response into PublicHoliday[]', async () => {
    const result = await fetchHolidays('NW', 2026)
    expect(result).toHaveLength(3)
    expect(result).toContainEqual({ date: '2026-01-01', name: 'Neujahrstag' })
    expect(result).toContainEqual({ date: '2026-05-01', name: 'Tag der Arbeit' })
  })

  it('returns empty array on API failure', async () => {
    server.use(
      http.get('https://feiertage-api.de/api/', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const result = await fetchHolidays('NW', 2026)
    expect(result).toEqual([])
  })
})

describe('isPublicHoliday', () => {
  const holidays: PublicHoliday[] = [
    { date: '2026-01-01', name: 'Neujahrstag' },
    { date: '2026-05-01', name: 'Tag der Arbeit' },
  ]

  it('returns true for a holiday date', () => {
    expect(isPublicHoliday('2026-01-01', holidays)).toBe(true)
  })

  it('returns false for a non-holiday date', () => {
    expect(isPublicHoliday('2026-01-02', holidays)).toBe(false)
  })
})
