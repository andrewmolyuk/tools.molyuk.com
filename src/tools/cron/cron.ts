/**
 * Standard 5-field cron: minute, hour, day-of-month, month, day-of-week.
 *
 * The rule that trips people up, and that this implements deliberately: when BOTH
 * day-of-month and day-of-week are restricted, cron runs on days matching EITHER of
 * them, not both. When only one is restricted, only that one applies.
 */

export interface CronField {
  key: string
  values: number[]
  restricted: boolean
}

export interface ParsedCron {
  minute: CronField
  hour: CronField
  dayOfMonth: CronField
  month: CronField
  dayOfWeek: CronField
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const SHORTCUTS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

interface FieldSpec {
  key: string
  min: number
  max: number
  names?: string[]
}

const SPECS: FieldSpec[] = [
  { key: 'minute', min: 0, max: 59 },
  { key: 'hour', min: 0, max: 23 },
  { key: 'dayOfMonth', min: 1, max: 31 },
  { key: 'month', min: 1, max: 12, names: MONTH_NAMES },
  { key: 'dayOfWeek', min: 0, max: 6, names: DAY_NAMES },
]

export class CronError extends Error {
  fieldKey: string

  constructor(fieldKey: string, message: string) {
    super(message)
    this.fieldKey = fieldKey
  }
}

function resolveToken(token: string, spec: FieldSpec): number {
  const named = spec.names?.indexOf(token.toLowerCase())
  if (named !== undefined && named >= 0) return named + (spec.key === 'month' ? 1 : 0)
  const n = Number(token)
  if (!Number.isInteger(n)) throw new CronError(spec.key, token)
  // Cron accepts 7 for Sunday as well as 0; normalise so the two spellings behave alike.
  if (spec.key === 'dayOfWeek' && n === 7) return 0
  if (n < spec.min || n > spec.max) throw new CronError(spec.key, token)
  return n
}

function parseField(raw: string, spec: FieldSpec): CronField {
  const values = new Set<number>()
  let restricted = false

  for (const part of raw.split(',')) {
    if (!part) throw new CronError(spec.key, raw)
    const [range, stepPart] = part.split('/')
    const step = stepPart === undefined ? 1 : Number(stepPart)
    if (!Number.isInteger(step) || step < 1) throw new CronError(spec.key, part)

    let from: number
    let to: number
    if (range === '*') {
      from = spec.min
      to = spec.max
      if (stepPart !== undefined) restricted = true
    } else if (range.includes('-')) {
      const [a, b] = range.split('-')
      from = resolveToken(a, spec)
      to = resolveToken(b, spec)
      if (from > to) throw new CronError(spec.key, range)
      restricted = true
    } else {
      from = resolveToken(range, spec)
      to = stepPart === undefined ? from : spec.max
      restricted = true
    }

    for (let v = from; v <= to; v += step) values.add(v)
  }

  if (!values.size) throw new CronError(spec.key, raw)
  return { key: spec.key, values: [...values].sort((a, b) => a - b), restricted }
}

export function parseCron(expression: string): ParsedCron {
  const trimmed = expression.trim().toLowerCase()
  const normalized = SHORTCUTS[trimmed] ?? trimmed
  const fields = normalized.split(/\s+/).filter(Boolean)
  if (fields.length !== 5) throw new CronError('expression', String(fields.length))

  const [minute, hour, dayOfMonth, month, dayOfWeek] = SPECS.map((spec, i) => parseField(fields[i], spec))
  return { minute, hour, dayOfMonth, month, dayOfWeek }
}

/**
 * Walks forward a day at a time rather than a minute at a time — a rare expression like
 * "0 0 29 2 *" is a handful of iterations this way instead of two million.
 */
export function nextRuns(cron: ParsedCron, from: Date, count: number, limitYears = 8): Date[] {
  const runs: Date[] = []
  const months = new Set(cron.month.values)
  const daysOfMonth = new Set(cron.dayOfMonth.values)
  const daysOfWeek = new Set(cron.dayOfWeek.values)
  const bothRestricted = cron.dayOfMonth.restricted && cron.dayOfWeek.restricted

  const day = new Date(from)
  day.setSeconds(0, 0)
  const startMinute = day.getHours() * 60 + day.getMinutes() + 1
  day.setHours(0, 0, 0, 0)

  const deadline = new Date(from)
  deadline.setFullYear(deadline.getFullYear() + limitYears)

  let firstDay = true
  while (runs.length < count && day <= deadline) {
    if (months.has(day.getMonth() + 1)) {
      const domMatch = daysOfMonth.has(day.getDate())
      const dowMatch = daysOfWeek.has(day.getDay())
      const dayMatches = bothRestricted ? domMatch || dowMatch : domMatch && dowMatch

      if (dayMatches) {
        for (const hour of cron.hour.values) {
          for (const minute of cron.minute.values) {
            if (firstDay && hour * 60 + minute < startMinute) continue
            const run = new Date(day)
            run.setHours(hour, minute, 0, 0)
            runs.push(run)
            if (runs.length >= count) return runs
          }
        }
      }
    }
    day.setDate(day.getDate() + 1)
    firstDay = false
  }
  return runs
}

/** Compact "0,15,30,45" / "0-59" style summary of what a field matches. */
export function describeValues(field: CronField, max: number): string {
  if (field.values.length === max) return '*'
  const groups: string[] = []
  let start = field.values[0]
  let prev = start
  for (const value of field.values.slice(1)) {
    if (value === prev + 1) {
      prev = value
      continue
    }
    groups.push(start === prev ? String(start) : `${start}-${prev}`)
    start = value
    prev = value
  }
  groups.push(start === prev ? String(start) : `${start}-${prev}`)
  return groups.join(',')
}

export const SHORTCUT_NAMES = Object.keys(SHORTCUTS)
