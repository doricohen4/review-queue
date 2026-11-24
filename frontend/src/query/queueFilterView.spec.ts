import { describe, expect, it } from 'vitest'
import {
  STATUS_QUICK_FILTERS,
  isQuickStatusActive,
  nextQuickStatusFilter,
  toQueueFilterView,
} from './queueFilterView'

const catalog = {
  status: [{ value: 'pending', label: 'Pending' }],
  risk: [{ value: 'high', label: 'High' }],
  submitter: [{ value: '1', label: 'Alice' }],
}

describe('toQueueFilterView', () => {
  it('maps URL filters and catalog options into one view for chips and the table', () => {
    expect(
      toQueueFilterView(
        {
          status: 'pending',
          risk: 'high',
          submitter: '1',
          created_after: '2026-01-01',
          created_before: '2026-01-31',
        },
        catalog,
      ),
    ).toEqual({
      status: 'pending',
      risk: 'high',
      submitter: '1',
      createdAfter: '2026-01-01',
      createdBefore: '2026-01-31',
      statusOptions: catalog.status,
      riskOptions: catalog.risk,
      submitterOptions: catalog.submitter,
    })
  })

  it('uses empty strings when a filter key is omitted', () => {
    expect(toQueueFilterView({}, { status: [], risk: [], submitter: [] })).toEqual({
      status: '',
      risk: '',
      submitter: '',
      createdAfter: '',
      createdBefore: '',
      statusOptions: [],
      riskOptions: [],
      submitterOptions: [],
    })
  })
})

describe('status quick filters', () => {
  it('keeps pending and needs_work as separate shortcuts', () => {
    expect(STATUS_QUICK_FILTERS.map((row) => row.value)).toEqual([
      'pending',
      'needs_work',
      'approved',
      'rejected',
    ])
  })

  it('is active only on an exact status match', () => {
    expect(isQuickStatusActive('pending', 'pending')).toBe(true)
    expect(isQuickStatusActive('pending,needs_work', 'pending')).toBe(false)
    expect(isQuickStatusActive('', 'pending')).toBe(false)
  })

  it('toggles the same shortcut off to mean all statuses', () => {
    expect(nextQuickStatusFilter('pending', 'pending')).toBe('')
    expect(nextQuickStatusFilter('', 'approved')).toBe('approved')
    expect(nextQuickStatusFilter('rejected', 'approved')).toBe('approved')
  })
})

