import { formatHours } from '../../shared/formatHours'
import { formatSignedHours } from '../month/monthBalanceFormat'
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

export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  if (rounded < 60) return `${rounded} min`
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest} min`
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm
}

function rhythmFacts(stats: AllTimeStats): FunFact[] {
  const facts: FunFact[] = []
  const { rhythm } = stats

  if (rhythm.mostCommonStartSlot !== null && rhythm.mostCommonStartCount > 1) {
    facts.push({
      id: 'favourite-start',
      icon: '⏰',
      text: `You start around ${rhythm.mostCommonStartSlot} more often than any other time — ${rhythm.mostCommonStartCount} days.`,
    })
  }

  if (rhythm.startSpreadMinutes !== null && stats.trackedDays > 2) {
    facts.push({
      id: 'start-consistency',
      icon: '🎚️',
      text:
        rhythm.startSpreadMinutes < 20
          ? `Your start time barely moves — ±${Math.round(rhythm.startSpreadMinutes)} min around the average.`
          : `Your start time swings by about ±${Math.round(rhythm.startSpreadMinutes)} min around the average.`,
    })
  }

  if (rhythm.earlyStarts > 0) {
    facts.push({
      id: 'early-starts',
      icon: '🌅',
      text: `${rhythm.earlyStarts} ${plural(rhythm.earlyStarts, 'day')} you were already going before 08:00.`,
    })
  }

  if (rhythm.lateFinishes > 0) {
    facts.push({
      id: 'late-finishes',
      icon: '🌃',
      text: `${rhythm.lateFinishes} ${plural(rhythm.lateFinishes, 'day')} ran past 18:00.`,
    })
  }

  return facts
}

function breakFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  const facts: FunFact[] = []
  const { breaks } = stats

  if (breaks.avgMinutesPerDay > 0) {
    const window =
      breaks.usualStartMinutes !== null && breaks.usualEndMinutes !== null
        ? `, usually around ${formatClock(breaks.usualStartMinutes)}`
        : ''
    facts.push({
      id: 'avg-break',
      icon: '☕',
      text: `You step away for ${formatMinutes(breaks.avgMinutesPerDay)} on an average tracked day${window}.`,
    })
  }

  if (breaks.longestWithinDay) {
    facts.push({
      id: 'longest-break',
      icon: '🛋️',
      text: `Longest single break: ${formatMinutes(breaks.longestWithinDay.minutes)} on ${formatFactDate(breaks.longestWithinDay.date)}.`,
    })
  }

  if (breaks.daysWithoutBreak > 0) {
    facts.push({
      id: 'no-break-days',
      icon: '🥊',
      text: `${breaks.daysWithoutBreak} ${plural(breaks.daysWithoutBreak, 'day')} went down as one unbroken period — ${formatHours(stats.avgHoursPerTrackedDay, format)} average day, no gaps logged.`,
    })
  }

  return facts
}

function weekFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  const facts: FunFact[] = []
  const { weeks } = stats

  if (weeks.bestWeek) {
    facts.push({
      id: 'best-week',
      icon: '🚀',
      text: `Biggest week: ${weeks.bestWeek.label} with ${formatHours(weeks.bestWeek.hours, format)} over ${weeks.bestWeek.trackedDays} ${plural(weeks.bestWeek.trackedDays, 'day')}.`,
    })
  }

  return facts
}

function extremeFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  const facts: FunFact[] = []
  const { extremes } = stats

  if (extremes.bestDayBalance && extremes.bestDayBalance.balance > 0) {
    facts.push({
      id: 'best-day-balance',
      icon: '🎖️',
      text: `Biggest surplus in one day: ${formatSignedHours(extremes.bestDayBalance.balance, format)} on ${formatFactDate(extremes.bestDayBalance.date)}.`,
    })
  }

  if (extremes.worstDayBalance && extremes.worstDayBalance.balance < 0) {
    facts.push({
      id: 'worst-day-balance',
      icon: '🪫',
      text: `Biggest shortfall in one day: ${formatSignedHours(extremes.worstDayBalance.balance, format)} on ${formatFactDate(extremes.worstDayBalance.date)}.`,
    })
  }

  if (extremes.weekendHours > 0) {
    facts.push({
      id: 'weekend-hours',
      icon: '🏖️',
      text: `${formatHours(extremes.weekendHours, format)} of your tracked time landed on a weekend.`,
    })
  }

  if (extremes.longestAbsence && extremes.longestAbsence.workdays > 1) {
    facts.push({
      id: 'longest-absence',
      icon: '👻',
      text: `Longest stretch with nothing tracked: ${extremes.longestAbsence.workdays} workdays, ${formatFactDate(extremes.longestAbsence.from)} → ${formatFactDate(extremes.longestAbsence.to)}.`,
    })
  }

  return facts
}

function disciplineFacts(stats: AllTimeStats): FunFact[] {
  const facts: FunFact[] = []
  const { discipline } = stats

  if (discipline.subtaskCount > 0) {
    facts.push({
      id: 'subtasks',
      icon: '✂️',
      text: `${discipline.subtaskCount} ${plural(discipline.subtaskCount, 'subtask')} carved out of your work periods.`,
    })
  }

  if (discipline.daysWithNotes > 0) {
    facts.push({
      id: 'notes',
      icon: '📝',
      text: `${discipline.daysWithNotes} ${plural(discipline.daysWithNotes, 'day')} carry a note.`,
    })
  }

  if (stats.firstTrackedDate !== null && stats.trackingSinceDays > 1) {
    facts.push({
      id: 'tracking-since',
      icon: '🌱',
      text: `You've been tracking for ${stats.trackingSinceDays} days, since ${formatFactDate(stats.firstTrackedDate)}.`,
    })
  }

  facts.push({
    id: 'next-milestone',
    icon: '🪜',
    text: `${round1(stats.hoursToNextMilestone)}h to go until ${stats.nextMilestone} hours tracked.`,
  })

  return facts
}

function overviewFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  const facts: FunFact[] = []

  facts.push({
    id: 'full-days',
    icon: '🌍',
    text: `Your tracked time adds up to ${round1(stats.totalHours / 24)} full 24-hour days — ${round1(stats.totalHours / 40)} forty-hour work weeks.`,
  })

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

  return facts
}

function recordFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  const facts: FunFact[] = []

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

  if (stats.daysWorkedOffSchedule > 0) {
    facts.push({
      id: 'off-schedule',
      icon: '🌙',
      text: `${stats.daysWorkedOffSchedule} day${stats.daysWorkedOffSchedule === 1 ? '' : 's'} tracked outside your normal schedule — weekends, holidays or leave.`,
    })
  }

  if (stats.vacationDays > 0 || stats.sickDays > 0) {
    facts.push({
      id: 'time-off',
      icon: '🌴',
      text: `Time off on record: ${stats.vacationDays} vacation day${stats.vacationDays === 1 ? '' : 's'} and ${stats.sickDays} sick day${stats.sickDays === 1 ? '' : 's'}.`,
    })
  }

  return facts
}

/**
 * The narrative layer over `AllTimeStats`: one sentence per fact, each dropped
 * when the underlying data can't support it, so a thin history shows fewer
 * facts rather than facts about nothing.
 */
export function buildFunFacts(stats: AllTimeStats, format: TimeFormat): FunFact[] {
  if (!stats.hasData) return []

  const facts = [
    ...overviewFacts(stats, format),
    ...recordFacts(stats, format),
    ...rhythmFacts(stats),
    ...breakFacts(stats, format),
    ...weekFacts(stats, format),
    ...extremeFacts(stats, format),
    ...disciplineFacts(stats),
  ]

  return facts
}
