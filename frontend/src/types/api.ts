export type HeuristicFlag = {
  key: string
  weight: number
  reason: string
}

export type Submitter = {
  id: number
  name: string
}

export type Item = {
  id: number
  title: string
  description: string
  status: string
  risk: string | null
  risk_score: number
  flags: HeuristicFlag[]
  confidence: string | null
  suggested_decision: string | null
  submitter?: Submitter
  created_at: string | null
}

export type Review = {
  id: number
  decision: string
  risk: string | null
  note: string | null
  reviewer?: Submitter
  created_at: string | null
}

export type Paginated<T> = {
  data: T[]
  meta: {
    total: number
    current_page: number
    last_page: number
    per_page: number
  }
}

export type FilterOption = {
  value: string
  label: string
}

export type FilterCatalog = {
  status: FilterOption[]
  risk: FilterOption[]
  sort: FilterOption[]
}
