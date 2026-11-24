import type { FilterCatalog, Item, Paginated } from '@/types/api'
import type { QueryState } from '@/query/queryState'
import { serializeQueryState } from '@/query/queryState'
import { getJson } from './http'

/** List URL without `item` — that id belongs to GET /api/items/{id}, not the list query. */
function listUrl(state: QueryState): string {
  const search = serializeQueryState({ ...state, item: null })
  return search === '' ? '/api/items' : `/api/items?${search}`
}

/** GET /api/items — paginated queue. */
export function fetchItems(state: QueryState): Promise<Paginated<Item>> {
  return getJson<Paginated<Item>>(listUrl(state))
}

/** GET /api/items/{id} — one row for the panel (unwraps Laravel's `{ data }`). */
export async function fetchItem(id: number, fetcher: typeof fetch = fetch): Promise<Item> {
  const payload = await getJson<{ data: Item }>(`/api/items/${id}`, {}, fetcher)
  return payload.data
}

/** GET /api/items/filters — toolbar options from ItemQuery's registry. */
export async function fetchFilterCatalog(): Promise<FilterCatalog> {
  const payload = await getJson<{ data: FilterCatalog }>('/api/items/filters')
  if (payload.data?.status === undefined) {
    throw new Error('Filter catalog missing')
  }
  return payload.data
}
