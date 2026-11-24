import type { FilterCatalog, Item, ItemTablePage, ResourceResponse, Review } from '@/types/api'
import { parseFilterCatalog, parseItem, parsePaginated, parseReview } from '@/types/parseApi'
import type { QueryState } from '@/query/queryState'
import { serializeQueryState } from '@/query/queryState'
import { getResponse, postRequest, putRequest } from './http'

export type SubmitItemBody = {
  title: string
  description: string
  submitter_name: string
}

export type ReviewItemsBody = {
  ids: number[]
  decision: string
  risk: string | null
  note: string | null
  reviewer_name: string
}

export type ReviewResult = {
  data: {
    updated: number[]
    failed: { id: number; reason: string }[]
  }
  meta: {
    updated_count: number
    failed_count: number
  }
}

/** List URL without `item` — that id belongs to GET /api/items/{id}, not the list query. */
function listUrl(state: QueryState): string {
  const search = serializeQueryState({ ...state, item: null })
  return search === '' ? '/api/items' : `/api/items?${search}`
}

/** GET /api/items — paginated queue. */
export async function fetchItems(
  state: QueryState,
  fetcher: typeof fetch = fetch,
): Promise<ItemTablePage> {
  const payload = await getResponse<unknown>(listUrl(state), {}, fetcher)
  return parsePaginated(payload, parseItem)
}

/** GET /api/items/{id} — one row for the panel (unwraps Laravel's `{ data }`). */
export async function fetchItem(id: number, fetcher: typeof fetch = fetch): Promise<Item> {
  const payload = await getResponse<ResourceResponse<unknown>>(`/api/items/${id}`, {}, fetcher)
  return parseItem(payload.data)
}

/** PUT /api/items/{id} — submitter edits pending copy in place. */
export async function updateItem(
  id: number,
  body: SubmitItemBody,
  fetcher: typeof fetch = fetch,
): Promise<Item> {
  const payload = await putRequest<SubmitItemBody, ResourceResponse<unknown>>(
    `/api/items/${id}`,
    body,
    fetcher,
  )
  return parseItem(payload.data)
}

/** POST /api/items/{id}/resubmit — needs_work → pending, new heuristic snapshot. */
export async function resubmitItem(
  id: number,
  body: SubmitItemBody,
  fetcher: typeof fetch = fetch,
): Promise<Item> {
  const payload = await postRequest<SubmitItemBody, ResourceResponse<unknown>>(
    `/api/items/${id}/resubmit`,
    body,
    fetcher,
  )
  return parseItem(payload.data)
}

/** PUT while pending; POST resubmit while needs_work. */
export function saveAuthorCopy(
  item: Item,
  body: SubmitItemBody,
  fetcher: typeof fetch = fetch,
): Promise<Item> {
  if (item.status === 'needs_work') {
    return resubmitItem(item.id, body, fetcher)
  }
  return updateItem(item.id, body, fetcher)
}

/** POST /api/items — unwraps `{ data }` so the form gets an Item. */
export async function submitItem(
  body: SubmitItemBody,
  fetcher: typeof fetch = fetch,
): Promise<Item> {
  const payload = await postRequest<SubmitItemBody, ResourceResponse<unknown>>(
    '/api/items',
    body,
    fetcher,
  )
  return parseItem(payload.data)
}

/** GET /api/items/{id}/audit — review notes, oldest first. */
export async function fetchAudit(id: number, fetcher: typeof fetch = fetch): Promise<Review[]> {
  const payload = await getResponse<unknown>(`/api/items/${id}/audit?per_page=50`, {}, fetcher)
  return parsePaginated(payload, parseReview).data
}

/** POST /api/items/review — one id today; same envelope as bulk. */
export function reviewItems(
  body: ReviewItemsBody,
  fetcher: typeof fetch = fetch,
): Promise<ReviewResult> {
  return postRequest<ReviewItemsBody, ReviewResult>('/api/items/review', body, fetcher)
}

/** GET /api/items/filters — toolbar options from ItemQuery's registry. */
export async function fetchFilterCatalog(): Promise<FilterCatalog> {
  const payload = await getResponse<unknown>('/api/items/filters')
  return parseFilterCatalog(payload)
}
