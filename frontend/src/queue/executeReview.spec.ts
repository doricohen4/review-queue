import { describe, expect, it, vi } from 'vitest'
import type { ReviewResult } from '@/api/items'
import type { Item } from '@/types/api'
import { executeReview } from './executeReview'

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
    latest_comment: null,
    created_at: null,
    updated_at: null,
  }
}

function ok(updated: number[], failed: { id: number; reason: string }[] = []): ReviewResult {
  return {
    data: { updated, failed },
    meta: { updated_count: updated.length, failed_count: failed.length },
  }
}

describe('executeReview', () => {
  it('keeps successful rows and rolls back only 207 failed ids', async () => {
    const reviewItems = vi.fn<() => Promise<ReviewResult>>(async () =>
      ok([1, 3], [{ id: 2, reason: 'same_person' }]),
    )

    const result = await executeReview({
      items: [item(1, 'pending'), item(2, 'pending'), item(3, 'pending')],
      openItem: item(2, 'pending'),
      selectedIds: [1, 2, 3],
      ids: [1, 2, 3],
      decision: 'approved',
      note: null,
      reviewerName: 'Bob Smith',
      reviewItems,
    })

    expect(result.kind).toBe('partial')
    if (result.kind !== 'partial') {
      return
    }
    expect(result.items.map((row) => row.status)).toEqual(['approved', 'pending', 'approved'])
    expect(result.openItem?.status).toBe('pending')
    expect(result.selectedIds).toEqual([1, 2, 3])
    expect(result.toast.tone).toBe('error')
  })

  it('rolls every id back when the request throws (422)', async () => {
    const reviewItems = vi.fn<() => Promise<ReviewResult>>(async () => {
      throw new Error('The note field is required when decision is needs_work.')
    })

    const result = await executeReview({
      items: [item(1, 'pending')],
      openItem: item(1, 'pending'),
      selectedIds: [1],
      ids: [1],
      decision: 'needs_work',
      note: null,
      reviewerName: 'Bob Smith',
      reviewItems,
    })

    expect(result.kind).toBe('error')
    if (result.kind !== 'error') {
      return
    }
    expect(result.items[0]?.status).toBe('pending')
    expect(result.openItem?.status).toBe('pending')
    expect(result.toast.message).toContain('note field is required')
  })
})
