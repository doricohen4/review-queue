import { describe, expect, it } from 'vitest'
import type { Item } from '@/types/api'
import { applyOptimisticReview, reconcileReviewResult } from './optimistic'

function item(id: number, status: string): Item {
  return {
    id,
    title: `Item ${id}`,
    description: 'Copy',
    status,
    risk: 'low',
    risk_score: 8,
    flags: [],
    confidence: 'high',
    suggested_decision: 'approve',
    created_at: null,
    updated_at: null,
  }
}

describe('optimistic review', () => {
  it('keeps successful rows and rolls back only failed ids after a 207', () => {
    const rows = [item(1, 'pending'), item(2, 'pending'), item(3, 'pending')]
    const { next, previous } = applyOptimisticReview(rows, [1, 2, 3], 'approved')

    expect(next.map((row) => row.status)).toEqual(['approved', 'approved', 'approved'])

    const reconciled = reconcileReviewResult(next, previous, [2])

    expect(reconciled.map((row) => ({ id: row.id, status: row.status }))).toEqual([
      { id: 1, status: 'approved' },
      { id: 2, status: 'pending' },
      { id: 3, status: 'approved' },
    ])
  })
})
