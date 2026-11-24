import type { FilterOption } from '@/types/api'

/** Inbox vs send-back vs done. Pending is reviewer work; needs_work is the author. */
export const STATUS_QUICK_FILTERS = [
  { value: 'pending', label: 'To review' },
  { value: 'needs_work', label: 'Needs work' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

export function isQuickStatusActive(current: string, value: string): boolean {
  return current === value
}

export function nextQuickStatusFilter(current: string, value: string): string {
  return current === value ? '' : value
}

/** One object for the chip bar and the table header filters. */
export type QueueFilterView = {
  status: string
  risk: string
  submitter: string
  createdAfter: string
  createdBefore: string
  statusOptions: FilterOption[]
  riskOptions: FilterOption[]
  submitterOptions: FilterOption[]
}

export function toQueueFilterView(
  filters: Record<string, string>,
  catalog: {
    status: FilterOption[]
    risk: FilterOption[]
    submitter: FilterOption[]
  },
): QueueFilterView {
  return {
    status: filters.status ?? '',
    risk: filters.risk ?? '',
    submitter: filters.submitter ?? '',
    createdAfter: filters.created_after ?? '',
    createdBefore: filters.created_before ?? '',
    statusOptions: catalog.status,
    riskOptions: catalog.risk,
    submitterOptions: catalog.submitter,
  }
}
