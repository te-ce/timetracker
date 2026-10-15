// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateMonth, invalidateMonthAll, invalidateMonthByYearMonth } from './queryKeys'
import { DEFAULT_WEEKDAY_HOURS } from './weekdayHours'

function seededClient(): QueryClient {
  const client = new QueryClient()
  client.setQueryData(QUERY_KEYS.sprintEntries(3, '2026-01-01', 14, DEFAULT_WEEKDAY_HOURS), [])
  client.setQueryData(
    QUERY_KEYS.sprintReminderEntries('2026-06-01', '2026-10-01', '2026-01-01', 14, DEFAULT_WEEKDAY_HOURS),
    [],
  )
  client.setQueryData(QUERY_KEYS.config, {})
  return client
}

function isInvalidated(client: QueryClient, key: readonly unknown[]): boolean {
  return client.getQueryState(key)?.isInvalidated ?? false
}

describe.each([
  ['invalidateMonth', (c: QueryClient) => invalidateMonth(c, '2026-10-05')],
  ['invalidateMonthByYearMonth', (c: QueryClient) => invalidateMonthByYearMonth(c, 2026, 10)],
  ['invalidateMonthAll', (c: QueryClient) => invalidateMonthAll(c)],
])('%s', (_name, invalidate) => {
  it('invalidates the sprint report and reminder entry queries', () => {
    const client = seededClient()
    invalidate(client)
    expect(isInvalidated(client, QUERY_KEYS.sprintEntries(3, '2026-01-01', 14, DEFAULT_WEEKDAY_HOURS))).toBe(true)
    expect(
      isInvalidated(
        client,
        QUERY_KEYS.sprintReminderEntries('2026-06-01', '2026-10-01', '2026-01-01', 14, DEFAULT_WEEKDAY_HOURS),
      ),
    ).toBe(true)
    expect(isInvalidated(client, QUERY_KEYS.config)).toBe(false)
  })
})

describe('sprint entry keys', () => {
  it('differ when weekday hours differ', () => {
    const other: typeof DEFAULT_WEEKDAY_HOURS = [0, 4, 8, 8, 8, 8, 0]
    expect(QUERY_KEYS.sprintEntries(1, '2026-01-01', 14, DEFAULT_WEEKDAY_HOURS)).not.toEqual(
      QUERY_KEYS.sprintEntries(1, '2026-01-01', 14, other),
    )
  })
})
