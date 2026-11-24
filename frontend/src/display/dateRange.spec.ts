import { describe, expect, it } from 'vitest'
import { calendarCells, isoDay, pickRangeDay } from './dateRange'

describe('dateRange', () => {
  it('builds a Monday-first month grid including leading/trailing days', () => {
    const cells = calendarCells(2026, 10)
    expect(cells[0]?.iso).toBe('2026-10-26')
    expect(cells.find((cell) => cell.iso === '2026-11-01')?.inMonth).toBe(true)
    expect(cells.at(-1)?.iso).toBe('2026-12-06')
  })

  it('picks a from/until range with two clicks', () => {
    expect(pickRangeDay({ after: '', before: '' }, '2026-11-10')).toEqual({
      after: '2026-11-10',
      before: '',
    })
    expect(pickRangeDay({ after: '2026-11-10', before: '' }, '2026-11-20')).toEqual({
      after: '2026-11-10',
      before: '2026-11-20',
    })
    expect(pickRangeDay({ after: '2026-11-10', before: '' }, '2026-11-02')).toEqual({
      after: '2026-11-02',
      before: '2026-11-10',
    })
    expect(pickRangeDay({ after: '2026-11-10', before: '2026-11-20' }, '2026-11-15')).toEqual({
      after: '2026-11-15',
      before: '',
    })
  })

  it('formats a local calendar day as ISO', () => {
    expect(isoDay(new Date(2026, 10, 24))).toBe('2026-11-24')
  })
})
