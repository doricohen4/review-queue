import { canReviewAs } from '@/personas'
import type { HeuristicFlag } from '@/types/api'

const EMPTY = '—'

export function samePerson(left: string | undefined, right: string): boolean {
  if (left == null || left === '') {
    return false
  }
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

export function canEditItem(
  item: { status: string; submitter?: { name: string } },
  actor: string,
): boolean {
  const editable = item.status === 'pending' || item.status === 'needs_work'
  return editable && samePerson(item.submitter?.name, actor)
}

/** Stable hue so the same submitter always gets the same icon color. */
export function submitterHue(name: string | undefined): number {
  const key = (name ?? '').trim().toLowerCase()
  let hash = 0
  for (const char of key) {
    hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0
  }
  return ((hash % 360) * 137) % 360
}

/** Header Update is only for exactly one selected row the actor may edit. */
export function editableSelection<T extends { id: number; status: string; submitter?: { name: string } }>(
  items: T[],
  selectedIds: number[],
  actor: string,
): T | null {
  if (selectedIds.length !== 1) {
    return null
  }
  const item = items.find((row) => row.id === selectedIds[0])
  if (item === undefined || !canEditItem(item, actor)) {
    return null
  }
  return item
}

export function canReviewItem(
  item: { status: string; submitter?: { name: string } },
  actor: string,
): boolean {
  return (
    canReviewAs(actor) && item.status === 'pending' && !samePerson(item.submitter?.name, actor)
  )
}

export function personName(name: string | undefined, empty = EMPTY): string {
  return name == null || name === '' ? empty : name
}

export function hasFlags(flags: HeuristicFlag[] | null | undefined): boolean {
  return (flags ?? []).length > 0
}

export function flagLine(flag: HeuristicFlag): string {
  return `${flag.key} (${flag.weight}) — ${flag.reason}`
}

export function initials(name: string | undefined): string {
  if (name == null || name === '') {
    return '?'
  }
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Recent rows say "just now" / "5m ago"; older rows get a calendar datetime. */
export function formatTimestamp(iso: string | null, now = Date.now()): string {
  if (iso === null || iso === '') {
    return EMPTY
  }
  const then = Date.parse(iso)
  if (Number.isNaN(then)) {
    return EMPTY
  }
  const minutes = Math.floor((now - then) / 60000)
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(then))
}
