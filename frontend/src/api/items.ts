import type { FilterCatalog, Item, Paginated } from '@/types/api'
import type { QueryState } from '@/query/queryState'
import { serializeQueryState } from '@/query/queryState'
import { getJson } from './http'

function listUrl(state: QueryState): string {
  const search = serializeQueryState({ ...state, panel: null })
  return search === '' ? '/api/items' : `/api/items?${search}`
}

/** GET /api/items — panel is stripped; the API ignores it anyway. */
export function fetchItems(state: QueryState): Promise<Paginated<Item>> {
  return getJson<Paginated<Item>>(listUrl(state))
}

/** GET /api/items/filters — toolbar options from the same registry. */
export async function fetchFilterCatalog(): Promise<FilterCatalog> {
  const payload = await getJson<{ data: FilterCatalog }>('/api/items/filters')
  if (payload.data?.status === undefined) {
    throw new Error('Filter catalog missing')
  }
  return payload.data
}
