import type {
  Confidence,
  FilterCatalog,
  FilterOption,
  HeuristicFlag,
  Item,
  LatestComment,
  Paginated,
  Review,
  RiskLevel,
  Submitter,
} from './api'

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

function parseLatestComment(value: unknown): LatestComment | null {
  if (value === undefined || value === null) {
    return null
  }
  if (!isRecord(value) || typeof value.note !== 'string' || value.note === '') {
    fail('latest_comment')
  }
  const reviewerName = value.reviewer_name
  if (reviewerName !== null && reviewerName !== undefined && typeof reviewerName !== 'string') {
    fail('latest_comment')
  }
  return {
    note: value.note,
    reviewer_name: typeof reviewerName === 'string' ? reviewerName : null,
  }
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
  if (typeof value.status !== 'string' || value.status === '') {
    fail('status')
  }
  const risk = value.risk === undefined || value.risk === null ? null : value.risk
  if (risk !== null && (typeof risk !== 'string' || !RISK_LEVELS.has(risk as RiskLevel))) {
    fail('risk')
  }

  const riskScore = parseScore(value.risk_score)
  const flags = value.flags === undefined || value.flags === null ? [] : value.flags
  if (!Array.isArray(flags)) {
    fail('flags')
  }

  const confidence = value.confidence === undefined ? null : value.confidence
  if (
    confidence !== null &&
    (typeof confidence !== 'string' || !CONFIDENCES.has(confidence as Confidence))
  ) {
    fail('confidence')
  }

  const suggested = value.suggested_decision === undefined ? null : value.suggested_decision
  if (suggested !== null && typeof suggested !== 'string') {
    fail('suggested_decision')
  }

  const created = value.created_at === undefined ? null : value.created_at
  if (created !== null && typeof created !== 'string') {
    fail('created_at')
  }

  const updated = value.updated_at === undefined ? null : value.updated_at
  if (updated !== null && typeof updated !== 'string') {
    fail('updated_at')
  }

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    status: value.status,
    risk: risk as RiskLevel | null,
    risk_score: riskScore,
    flags: flags.map(parseFlag),
    confidence: confidence as Confidence | null,
    suggested_decision: suggested,
    submitter: parseSubmitter(value.submitter),
    latest_comment: parseLatestComment(value.latest_comment),
    created_at: created,
    updated_at: updated,
  }
}

/** Runtime check for ReviewResource (audit timeline). */
export function parseReview(value: unknown): Review {
  if (!isRecord(value)) {
    fail('object')
  }
  if (typeof value.id !== 'number') {
    fail('id')
  }
  if (typeof value.decision !== 'string' || value.decision === '') {
    fail('decision')
  }
  const risk = value.risk === undefined || value.risk === null ? null : value.risk
  if (risk !== null && (typeof risk !== 'string' || !RISK_LEVELS.has(risk as RiskLevel))) {
    fail('risk')
  }
  const note = value.note === undefined || value.note === null ? null : value.note
  if (note !== null && typeof note !== 'string') {
    fail('note')
  }
  const created = value.created_at === undefined ? null : value.created_at
  if (created !== null && typeof created !== 'string') {
    fail('created_at')
  }
  return {
    id: value.id,
    decision: value.decision,
    risk: risk as RiskLevel | null,
    note,
    reviewer: parseSubmitter(value.reviewer === null ? undefined : value.reviewer),
    created_at: created,
  }
}

function parseScore(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return 0
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  fail('risk_score')
}

function parseOptions(value: unknown): FilterOption[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((row) => {
    if (!isRecord(row) || typeof row.label !== 'string') {
      return []
    }
    const optionValue =
      typeof row.value === 'string' ? row.value : typeof row.key === 'string' ? row.key : null
    if (optionValue === null) {
      return []
    }
    return [{ value: optionValue, label: row.label }]
  })
}

/** ItemQuery `{ data }` or a legacy `{ filters, sorts }` toolbar payload. */
export function parseFilterCatalog(payload: unknown): FilterCatalog {
  if (!isRecord(payload)) {
    throw new Error('Filter catalog missing')
  }

  if (isRecord(payload.data) && Array.isArray(payload.data.status)) {
    return {
      status: parseOptions(payload.data.status),
      risk: parseOptions(payload.data.risk),
      sort: parseOptions(payload.data.sort),
      submitter: parseOptions(payload.data.submitter),
    }
  }

  if (Array.isArray(payload.filters)) {
    const byKey: Record<string, FilterOption[]> = {}
    for (const filter of payload.filters) {
      if (isRecord(filter) && typeof filter.key === 'string') {
        byKey[filter.key] = parseOptions(filter.options)
      }
    }
    return {
      status: byKey.status ?? [],
      risk: (byKey.risk ?? []).filter((option) => option.value !== 'none'),
      sort: parseOptions(payload.sorts),
      submitter: byKey.submitter ?? [],
    }
  }

  throw new Error('Filter catalog missing')
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
