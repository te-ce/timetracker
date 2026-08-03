import { formatHours } from '../../shared/formatHours'
import { parseLocalDate } from '../../shared/dateUtils'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { formatClock, type AllTimeStats } from './allTimeStats'

export interface FunFact {
  id: string
  icon: string
  text: string
}

export function formatFactDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function round1(value: number): string {
  return (Math.round(value * 10) / 10).toString()
}

/**
 * The narrative layer over `AllTimeStats`: one sentence per fact, each dropped
 * when the underlying data can't support it, so a thin history shows fewer
 * facts rather than facts about nothing.
 */
export function buildFunFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  const facts: FunFact[] = []
  if (!stats.hasData) return facts

  facts.push({
    id: 'full-days',
    icon: '🌍',
    text: `Your tracked time adds up to ${round1(stats.totalHours / 24)} full 24-hour days — ${round1(stats.totalHours / 40)} forty-hour work weeks.`,
  })

  if (stats.longestStreak && stats.longestStreak.length > 1) {
    facts.push({
      id: 'longest-streak',
      icon: '🔥',
      text: `Longest run: ${stats.longestStreak.length} tracked workdays in a row, ${formatFactDate(stats.longestStreak.from)} → ${formatFactDate(stats.longestStreak.to)}.`,
    })
  }

  if (stats.currentStreak > 1) {
    facts.push({
      id: 'current-streak',
      icon: '⚡',
      text: `You're on a ${stats.currentStreak}-workday streak right now.`,
    })
  }

  if (stats.busiestWeekday && stats.busiestWeekday.trackedDays > 0) {
    facts.push({
      id: 'busiest-weekday',
      icon: '📅',
      text: `${stats.busiestWeekday.label} is your heaviest day — ${formatHours(stats.busiestWeekday.avgHours, format)} on average across ${stats.busiestWeekday.trackedDays} of them.`,
    })
  }

  if (stats.busiestMonth) {
    facts.push({
      id: 'busiest-month',
      icon: '🏆',
      text: `Biggest month so far: ${stats.busiestMonth.label} with ${formatHours(stats.busiestMonth.hours, format)} over ${stats.busiestMonth.trackedDays} days.`,
    })
  }

  if (stats.avgStartMinutes !== null && stats.avgEndMinutes !== null) {
    facts.push({
      id: 'rhythm',
      icon: '🕰️',
      text: `Your typical day runs ${formatClock(stats.avgStartMinutes)} → ${formatClock(stats.avgEndMinutes)}.`,
    })
  }

  if (stats.earliestStart) {
    facts.push({
      id: 'early-bird',
      icon: '🐓',
      text: `Earliest start ever: ${stats.earliestStart.time} on ${formatFactDate(stats.earliestStart.date)}.`,
    })
  }

  if (stats.latestEnd) {
    facts.push({
      id: 'night-owl',
      icon: '🦉',
      text: `Latest finish ever: ${stats.latestEnd.time} on ${formatFactDate(stats.latestEnd.date)}.`,
    })
  }

  if (stats.longestDay) {
    facts.push({
      id: 'longest-day',
      icon: '🏋️',
      text: `Longest day: ${formatHours(stats.longestDay.hours, format)} on ${formatFactDate(stats.longestDay.date)}.`,
    })
  }

  if (stats.longestPeriod) {
    facts.push({
      id: 'longest-period',
      icon: '⏱️',
      text: `Longest single stretch without stopping: ${formatHours(stats.longestPeriod.hours, format)} (${stats.longestPeriod.start}–${stats.longestPeriod.end}) on ${formatFactDate(stats.longestPeriod.date)}.`,
    })
  }

  const top = stats.categories[0]
  if (top) {
    facts.push({
      id: 'top-category',
      icon: '🎯',
      text: `${top.category} takes the biggest slice — ${Math.round(top.percent)}% of everything you've tracked.`,
    })
  }

  if (stats.trackedDays > 0) {
    facts.push({
      id: 'target-hit-rate',
      icon: '✅',
      text: `You hit or beat the daily target on ${Math.round((stats.daysAtOrOverTarget / stats.trackedDays) * 100)}% of tracked days.`,
    })
  }

  if (stats.periodCount > 0) {
    facts.push({
      id: 'periods',
      icon: '🧩',
      text: `${stats.periodCount} work periods logged — ${round1(stats.avgPeriodsPerTrackedDay)} per tracked day.`,
    })
  }

  if (stats.daysWorkedOffSchedule > 0) {
    facts.push({
      id: 'off-schedule',
      icon: '🌙',
      text: `${stats.daysWorkedOffSchedule} day${stats.daysWorkedOffSchedule === 1 ? '' : 's'} tracked outside your normal schedule — weekends, holidays or leave.`,
    })
  }

  if (stats.location.officeDays > 0) {
    facts.push({
      id: 'office-split',
      icon: '🏢',
      text: `${stats.location.officePercent}% of tracked days were in the office (${stats.location.officeDays} of ${stats.trackedDays}).`,
    })
  }

  if (stats.vacationDays > 0 || stats.sickDays > 0) {
    facts.push({
      id: 'time-off',
      icon: '🌴',
      text: `Time off on record: ${stats.vacationDays} vacation day${stats.vacationDays === 1 ? '' : 's'} and ${stats.sickDays} sick day${stats.sickDays === 1 ? '' : 's'}.`,
    })
  }

  if (stats.firstTrackedDate !== null && stats.calendarSpanDays > stats.trackedDays) {
    facts.push({
      id: 'coverage',
      icon: '🗓️',
      text: `You've tracked ${stats.trackedDays} of the ${stats.calendarSpanDays} calendar days since ${formatFactDate(stats.firstTrackedDate)}.`,
    })
  }

  return facts
}
