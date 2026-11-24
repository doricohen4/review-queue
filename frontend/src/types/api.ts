/** Matches App\Enums\ItemStatus. */
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'needs_work' | 'cancelled'

/** Matches App\Enums\RiskLevel — there is no "none". */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type Confidence = 'low' | 'medium' | 'high'

export type HeuristicFlag = {
  key: string
  weight: number
  reason: string
}

export type Submitter = {
  id: number
  name: string
}

/** Newest review note left on an item. Null when nobody wrote one. */
export type LatestComment = {
  note: string
  reviewer_name: string | null
}

/** ItemResource JSON (list, show, submit). */
export type Item = {
  id: number
  title: string
  description: string
  status: ItemStatus | string
  risk: RiskLevel | null
  risk_score: number
  flags: HeuristicFlag[]
  confidence: Confidence | null
  suggested_decision: string | null
  submitter?: Submitter
  latest_comment: LatestComment | null
  created_at: string | null
  updated_at: string | null
}

/** ReviewResource JSON (audit). */
export type Review = {
  id: number
  decision: string
  risk: RiskLevel | null
  note: string | null
  reviewer?: Submitter
  created_at: string | null
}

/** Laravel `{ data: TResource }` (show, submit, filters). */
export type ResourceResponse<TResource> = {
  data: TResource
}

/** Laravel paginator. `TItem` is one table row (ItemResource). */
export type Paginated<TItem> = {
  data: TItem[]
  meta: {
    total: number
    current_page: number
    last_page: number
    per_page: number
  }
}

/** GET /api/items — queue table. */
export type ItemTablePage = Paginated<Item>

/** GET /api/items/{id} — HTTP envelope around one item. */
export type ItemPanelResponse = ResourceResponse<Item>

/** Side panel model after parseItem (same fields as a table row today). */
export type ItemPanelData = Item

export type FilterOption = {
  value: string
  label: string
}

export type FilterCatalog = {
  status: FilterOption[]
  risk: FilterOption[]
  sort: FilterOption[]
  submitter: FilterOption[]
}
