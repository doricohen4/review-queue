export type QueryState = {
  q: string
  filters: Record<string, string>
  sort: string
  page: number
  perPage: number
  item: string | null
}

const DEFAULT_SORT = '-created_at'
const DEFAULT_PER_PAGE = 15

/**
 * Read the list URL into queue state.
 * filter[status]=pending becomes filters.status — Vue Router keeps the brackets as the key.
 */
export function parseQueryState(search: string): QueryState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const filters: Record<string, string> = {}

  // Collect only filter[…] keys. Other params (q, page, item) are read by name below.
  for (const [key, value] of params.entries()) {
    const filterName = /^filter\[(.+)]$/.exec(key)?.[1]
    if (filterName !== undefined) {
      filters[filterName] = value
    }
  }

  const item = params.get('item')

  return {
    q: params.get('q') ?? '',
    filters,
    sort: params.get('sort') ?? DEFAULT_SORT,
    page: Number(params.get('page') ?? '1') || 1,
    perPage: Number(params.get('per_page') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
    item: item === null || item === '' ? null : item,
  }
}

/**
 * Write queue state back to a query string.
 * Defaults stay off the URL so `/` means newest page 1 with no filters.
 */
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

  if (state.item !== null && state.item !== '') {
    params.set('item', state.item)
  }

  return params.toString()
}

/** Same pairs as serializeQueryState, in the shape Vue Router's `query` option expects. */
export function queryStateToRouteQuery(state: QueryState): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(serializeQueryState(state)))
}
