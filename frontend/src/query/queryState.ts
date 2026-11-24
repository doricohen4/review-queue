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

export type SortColumn = 'title' | 'created_at' | 'updated_at' | 'risk_score'

/**
 * `filter[status]=pending,needs_work` is one URL param (OR on the API).
 * Empty string / omitted = all options. `-` is explicit “nothing selected”,
 * because omitting the param also means “all”.
 */
export const FILTER_EMPTY = '-'

export function splitFilterValues(raw: string): string[] {
  if (raw === FILTER_EMPTY) {
    return []
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

/** Chip bar / filter badge: at most three names, then `extra` for “+N”. */
export const FILTER_NAME_CHIP_LIMIT = 3

export function summarizeNamedFilters(
  raw: string,
  options: { value: string; label: string }[],
  limit = FILTER_NAME_CHIP_LIMIT,
): { named: { value: string; label: string }[]; extra: number } {
  const values = splitFilterValues(raw)
  const named = values.slice(0, limit).map((value) => ({
    value,
    label: options.find((option) => option.value === value)?.label ?? value,
  }))
  return { named, extra: Math.max(0, values.length - named.length) }
}

/** Empty URL filter means every option is on. `-` means every option is off. */
export function selectedFilterSet(raw: string, allValues: string[]): string[] {
  if (raw === FILTER_EMPTY) {
    return []
  }
  if (raw === '') {
    return [...allValues]
  }
  return splitFilterValues(raw)
}

export function isAllFiltersSelected(raw: string, allValues: string[]): boolean {
  if (raw === FILTER_EMPTY) {
    return false
  }
  if (raw === '') {
    return true
  }
  if (allValues.length === 0) {
    return false
  }
  const selected = new Set(splitFilterValues(raw))
  return allValues.every((value) => selected.has(value))
}

function serializeFilterSet(selected: Set<string>, allValues: string[]): string {
  if (selected.size === 0) {
    return FILTER_EMPTY
  }
  if (allValues.length > 0 && allValues.every((value) => selected.has(value))) {
    return ''
  }
  return allValues.filter((value) => selected.has(value)).join(',')
}

export function toggleAllFilterValues(raw: string, allValues: string[]): string {
  return isAllFiltersSelected(raw, allValues) ? FILTER_EMPTY : ''
}

export function toggleFilterValue(raw: string, value: string, allValues: string[] = []): string {
  if (value === '') {
    return toggleAllFilterValues(raw, allValues)
  }
  const next = new Set(selectedFilterSet(raw, allValues))
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return serializeFilterSet(next, allValues)
}

/** Click a table header: first click uses the column default, then flip asc/desc. */
export function toggleSortKey(current: string, column: SortColumn): string {
  const desc = `-${column}`
  if (current === column) {
    return desc
  }
  if (current === desc) {
    return column
  }
  return column === 'title' ? column : desc
}

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
