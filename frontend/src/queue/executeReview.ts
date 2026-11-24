import type { ReviewItemsBody, ReviewResult } from '@/api/items'
import { applyOptimisticReview, reconcileReviewResult } from '@/review/optimistic'
import type { Item } from '@/types/api'

export type ReviewToast = {
  message: string
  tone: 'info' | 'success' | 'error'
}

export type ExecuteReviewInput = {
  items: Item[]
  openItem: Item | null
  selectedIds: number[]
  ids: number[]
  decision: string
  note: string | null
  reviewerName: string
  reviewItems: (body: ReviewItemsBody) => Promise<ReviewResult>
}

export type ExecuteReviewResult =
  | {
      kind: 'success'
      items: Item[]
      openItem: Item | null
      selectedIds: number[]
      toast: ReviewToast
    }
  | {
      kind: 'partial'
      items: Item[]
      openItem: Item | null
      selectedIds: number[]
      error: string
      toast: ReviewToast
    }
  | {
      kind: 'error'
      items: Item[]
      openItem: Item | null
      selectedIds: number[]
      error: string
      toast: ReviewToast
    }

function paintOpenItem(openItem: Item | null, items: Item[], ids: number[]): Item | null {
  if (openItem === null || !ids.includes(openItem.id)) {
    return openItem
  }
  return items.find((row) => row.id === openItem.id) ?? openItem
}

function restoreOpenItem(
  openItem: Item | null,
  previous: Map<number, string>,
  ids: number[],
): Item | null {
  if (openItem === null || !ids.includes(openItem.id)) {
    return openItem
  }
  const status = previous.get(openItem.id)
  return status === undefined ? openItem : { ...openItem, status }
}

/** Optimistic paint → POST review → keep successes, restore failed[] (or all ids on throw). */
export async function executeReview(input: ExecuteReviewInput): Promise<ExecuteReviewResult> {
  const { next, previous } = applyOptimisticReview(input.items, input.ids, input.decision)
  const paintedOpen = paintOpenItem(input.openItem, next, input.ids)

  try {
    const result = await input.reviewItems({
      ids: input.ids,
      decision: input.decision,
      risk: null,
      note: input.note,
      reviewer_name: input.reviewerName,
    })
    const failedIds = result.data.failed.map((row) => row.id)
    const items = reconcileReviewResult(next, previous, failedIds)
    const openItem = paintOpenItem(paintedOpen, items, input.ids)

    if (result.meta.failed_count === 0) {
      return {
        kind: 'success',
        items,
        openItem,
        selectedIds: input.selectedIds.filter((id) => !input.ids.includes(id)),
        toast: {
          message:
            input.ids.length === 1
              ? 'Review submitted.'
              : `All ${result.meta.updated_count} reviews submitted.`,
          tone: 'success',
        },
      }
    }

    const reason = result.data.failed[0]?.reason
    return {
      kind: 'partial',
      items,
      openItem,
      selectedIds: input.selectedIds,
      error: reason ?? 'Review failed',
      toast: {
        message: `${result.meta.updated_count} updated, ${result.meta.failed_count} failed${reason ? `: ${reason}` : '.'}`,
        tone: 'error',
      },
    }
  } catch (caught) {
    const items = reconcileReviewResult(next, previous, input.ids)
    const message = caught instanceof Error ? caught.message : 'Could not review'
    return {
      kind: 'error',
      items,
      openItem: restoreOpenItem(paintedOpen, previous, input.ids),
      selectedIds: input.selectedIds,
      error: message,
      toast: { message, tone: 'error' },
    }
  }
}
