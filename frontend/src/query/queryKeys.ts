import { serializeQueryState, type QueryState } from './queryState'

/** TanStack Query keys. List cache follows the same string as the shareable URL (minus `item`). */
export const filterCatalogQueryKey = ['filters'] as const

export function itemsQueryKey(state: QueryState): readonly ['items', string] {
  return ['items', serializeQueryState({ ...state, item: null })]
}

export function itemQueryKey(id: number): readonly ['item', number] {
  return ['item', id]
}

export function auditQueryKey(id: number): readonly ['audit', number] {
  return ['audit', id]
}
