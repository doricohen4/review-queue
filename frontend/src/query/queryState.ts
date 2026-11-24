export type QueryState = {
  q: string
  filters: Record<string, string>
  sort: string
  page: number
  perPage: number
  panel: string | null
}

const DEFAULT_SORT = '-created_at'
const DEFAULT_PER_PAGE = 15

/** Parse the list URL into q, filter[], sort, page, per_page, and UI-only panel. */
export function parseQueryState(search: string): QueryState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const filters: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    const match = /^filter\[(.+)]$/.exec(key)
    if (match) {
      filters[match[1]] = value
    }
  }

  return {
    q: params.get('q') ?? '',
    filters,
    sort: params.get('sort') ?? DEFAULT_SORT,
    page: Number(params.get('page') ?? '1') || 1,
    perPage: Number(params.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
    panel: params.get('panel'),
  }
}

/** Serialize list state. Defaults and empty values stay off the URL. */
export function serializeQueryState(state: QueryState): string {
  const params = new URLSearchParams()

  if (state.q !== '') {
    params.set('q', state.q)
  }

  for (const [key, value] of Object.entries(state.filters)) {
    if (value !== '') {
      params.set(`filter[${key}]`, value)
    }
  }

  if (state.sort !== DEFAULT_SORT) {
    params.set('sort', state.sort)
  }

  if (state.page > 1) {
    params.set('page', String(state.page))
  }

  if (state.perPage !== DEFAULT_PER_PAGE) {
    params.set('per_page', String(state.perPage))
  }

  if (state.panel !== null && state.panel !== '') {
    params.set('panel', state.panel)
  }

  return params.toString()
}

/** Vue Router `query` object from the same serializer. */
export function queryStateToRouteQuery(state: QueryState): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(serializeQueryState(state)))
}
