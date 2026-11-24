import { describe, expect, it } from 'vitest'
import { auditQueryKey, filterCatalogQueryKey, itemQueryKey, itemsQueryKey } from './queryKeys'
import { serializeQueryState, type QueryState } from './queryState'

const base: QueryState = {
  q: 'math',
  filters: { status: 'pending' },
  sort: '-created_at',
  page: 2,
  perPage: 15,
  item: '12',
}

describe('queryKeys', () => {
  it('keys the list cache by the serialized list URL, not the open panel id', () => {
    expect(itemsQueryKey(base)).toEqual(['items', serializeQueryState({ ...base, item: null })])
    expect(itemsQueryKey({ ...base, item: '99' })).toEqual(itemsQueryKey(base))
  })

  it('keys one item and its audit by id', () => {
    expect(itemQueryKey(12)).toEqual(['item', 12])
    expect(auditQueryKey(12)).toEqual(['audit', 12])
    expect(filterCatalogQueryKey).toEqual(['filters'])
  })
})
