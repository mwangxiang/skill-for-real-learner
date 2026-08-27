import type { ReviewEntry, ReviewHistoryItem } from './types.ts'

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/u

export function assertLocalDate(value: string): void {
  if (!LOCAL_DATE.test(value)) throw new Error(`invalid local date: ${value}`)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) {
    throw new Error(`invalid local date: ${value}`)
  }
}

export function addLocalDays(localDate: string, days: number): string {
  assertLocalDate(localDate)
  if (!Number.isInteger(days)) throw new Error('days must be an integer')
  const [year, month, day] = localDate.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day! + days))
  return date.toISOString().slice(0, 10)
}

export function nextReviewInterval(current: 3 | 7 | 21, result: ReviewHistoryItem['result']): 3 | 7 | 21 {
  if (result !== 'met') return 3
  if (current === 3) return 7
  return 21
}

export function recordReviewResult(entry: ReviewEntry, localDate: string, result: ReviewHistoryItem['result']): ReviewEntry {
  assertLocalDate(localDate)
  const intervalDays = nextReviewInterval(entry.intervalDays, result)
  return {
    ...entry,
    intervalDays,
    dueDate: addLocalDays(localDate, intervalDays),
    state: 'scheduled',
    history: [...entry.history, { localDate, result }],
  }
}

export function markReviewDue(entry: ReviewEntry, today: string): ReviewEntry {
  assertLocalDate(today)
  return entry.state === 'scheduled' && entry.dueDate <= today ? { ...entry, state: 'due' } : entry
}
