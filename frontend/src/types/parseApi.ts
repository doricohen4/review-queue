import type {
  Confidence,
  HeuristicFlag,
  Item,
  ItemStatus,
  Paginated,
  RiskLevel,
  Submitter,
} from './api'

const ITEM_STATUSES = new Set<ItemStatus>([
  'pending',
  'approved',
  'rejected',
  'needs_work',
  'cancelled',
])

const RISK_LEVELS = new Set<RiskLevel>(['low', 'medium', 'high', 'critical'])
const CONFIDENCES = new Set<Confidence>(['low', 'medium', 'high'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(field: string): never {
  throw new Error(`Invalid item JSON: ${field}`)
}

function parseSubmitter(value: unknown): Submitter | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.name !== 'string') {
    fail('submitter')
  }
  return { id: value.id, name: value.name }
}

function parseFlag(value: unknown): HeuristicFlag {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.weight !== 'number' ||
    typeof value.reason !== 'string'
  ) {
    fail('flags')
  }
  return { key: value.key, weight: value.weight, reason: value.reason }
}

/** Runtime check that JSON matches ItemResource (compile-time `as Item` is not enough). */
export function parseItem(value: unknown): Item {
  if (!isRecord(value)) {
    fail('object')
  }
  if (typeof value.id !== 'number') {
    fail('id')
  }
  if (typeof value.title !== 'string' || typeof value.description !== 'string') {
    fail('title')
  }
  if (typeof value.status !== 'string' || !ITEM_STATUSES.has(value.status as ItemStatus)) {
    fail('status')
  }
  if (
    value.risk !== null &&
    (typeof value.risk !== 'string' || !RISK_LEVELS.has(value.risk as RiskLevel))
  ) {
    fail('risk')
  }
  if (typeof value.risk_score !== 'number') {
    fail('risk_score')
  }
  if (!Array.isArray(value.flags)) {
    fail('flags')
  }
  if (
    value.confidence !== null &&
    (typeof value.confidence !== 'string' || !CONFIDENCES.has(value.confidence as Confidence))
  ) {
    fail('confidence')
  }
  if (value.suggested_decision !== null && typeof value.suggested_decision !== 'string') {
    fail('suggested_decision')
  }
  if (value.created_at !== null && typeof value.created_at !== 'string') {
    fail('created_at')
  }

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    status: value.status as ItemStatus,
    risk: value.risk as RiskLevel | null,
    risk_score: value.risk_score,
    flags: value.flags.map(parseFlag),
    confidence: value.confidence as Confidence | null,
    suggested_decision: value.suggested_decision,
    submitter: parseSubmitter(value.submitter),
    created_at: value.created_at,
  }
}

/** Laravel paginator `{ data, meta }`. Extra keys (links) are ignored. */
export function parsePaginated<TItem>(
  payload: unknown,
  parseRow: (row: unknown) => TItem,
): Paginated<TItem> {
  if (!isRecord(payload) || !Array.isArray(payload.data) || !isRecord(payload.meta)) {
    fail('page')
  }

  const { meta } = payload
  if (
    typeof meta.total !== 'number' ||
    typeof meta.current_page !== 'number' ||
    typeof meta.last_page !== 'number' ||
    typeof meta.per_page !== 'number'
  ) {
    fail('meta')
  }

  return {
    data: payload.data.map(parseRow),
    meta: {
      total: meta.total,
      current_page: meta.current_page,
      last_page: meta.last_page,
      per_page: meta.per_page,
    },
  }
}
