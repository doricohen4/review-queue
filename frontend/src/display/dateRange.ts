export type DateRange = { after: string; before: string }

export type CalendarCell = {
  iso: string
  day: number
  inMonth: boolean
}

export function isoDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

/** Monday-first grid of 6 weeks for the given calendar month (month is 0-indexed). */
export function calendarCells(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const weekday = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - weekday)
  const cells: CalendarCell[] = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    cells.push({
      iso: isoDay(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    })
  }
  return cells
}

export function pickRangeDay(range: DateRange, iso: string): DateRange {
  if (range.after === '' || range.before !== '') {
    return { after: iso, before: '' }
  }
  if (iso < range.after) {
    return { after: iso, before: range.after }
  }
  return { after: range.after, before: iso }
}

export function inRange(iso: string, range: DateRange): boolean {
  if (range.after !== '' && iso < range.after) {
    return false
  }
  if (range.before !== '' && iso > range.before) {
    return false
  }
  return range.after !== '' || range.before !== ''
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(year, month + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

export { fromIso }
