import type { Item } from '@/types/api'

function nextStatus(decision: string): string {
  if (decision === 'needs_work') {
    return 'needs_work'
  }
  return decision
}

/** Paint the new status immediately; keep the old one so a 207 can undo failures. */
export function applyOptimisticReview(
  items: Item[],
  ids: number[],
  decision: string,
): { next: Item[]; previous: Map<number, string> } {
  const wanted = new Set(ids)
  const previous = new Map<number, string>()
  const status = nextStatus(decision)

  const next = items.map((item) => {
    if (!wanted.has(item.id)) {
      return item
    }
    previous.set(item.id, item.status)
    return { ...item, status }
  })

  return { next, previous }
}

/** Restore only ids the API listed in failed[]. Successful rows stay updated. */
export function reconcileReviewResult(
  items: Item[],
  previous: Map<number, string>,
  failedIds: number[],
): Item[] {
  const failed = new Set(failedIds)

  return items.map((item) => {
    if (!failed.has(item.id)) {
      return item
    }
    const status = previous.get(item.id)
    return status === undefined ? item : { ...item, status }
  })
}
