import { describe, expect, it } from 'vitest'
import {
  FILTER_NONE,
  isAllFiltersSelected,
  parseQueryState,
  selectedFilterSet,
  serializeQueryState,
  splitFilterValues,
  toggleAllFilterValues,
  toggleFilterValue,
  toggleSortKey,
} from './queryState'

describe('queryState', () => {
  it('parses q and filter[status] from the search string', () => {
    const state = parseQueryState('q=math&filter[status]=pending')

    expect(state.q).toBe('math')
    expect(state.filters.status).toBe('pending')
    expect(state.item).toBeNull()
  })

  it('serializes q and filter[status] back onto the query string', () => {
    const search = serializeQueryState({
      q: 'math',
      filters: { status: 'pending' },
      sort: '-created_at',
      page: 1,
      perPage: 15,
      item: null,
    })

    const params = new URLSearchParams(search)
    expect(params.get('q')).toBe('math')
    expect(params.get('filter[status]')).toBe('pending')
  })

  it('round-trips item as a UI-only param', () => {
    const search = serializeQueryState({
      q: '',
      filters: {},
      sort: '-created_at',
      page: 1,
      perPage: 15,
      item: '12',
    })

    expect(new URLSearchParams(search).get('item')).toBe('12')
    expect(parseQueryState(search).item).toBe('12')
  })

  it('toggles comma-separated filter values without dropping the others', () => {
    const all = ['pending', 'approved', 'needs_work']
    expect(toggleFilterValue('pending', 'needs_work', all)).toBe('pending,needs_work')
    expect(toggleFilterValue('pending,needs_work', 'pending', all)).toBe('needs_work')
    expect(splitFilterValues('pending,needs_work')).toEqual(['pending', 'needs_work'])
  })

  it('treats All as every option, and unchecking All clears every option', () => {
    const all = ['pending', 'approved', 'needs_work']
    expect(isAllFiltersSelected('', all)).toBe(true)
    expect(selectedFilterSet('', all)).toEqual(all)
    expect(toggleAllFilterValues('', all)).toBe(FILTER_NONE)
    expect(isAllFiltersSelected(FILTER_NONE, all)).toBe(false)
    expect(selectedFilterSet(FILTER_NONE, all)).toEqual([])
    expect(toggleAllFilterValues(FILTER_NONE, all)).toBe('')
    expect(toggleFilterValue('', 'pending', all)).toBe('approved,needs_work')
    expect(toggleFilterValue(FILTER_NONE, 'pending', all)).toBe('pending')
  })

  it('toggles a column between asc and desc sort keys', () => {
    expect(toggleSortKey('-created_at', 'title')).toBe('title')
    expect(toggleSortKey('title', 'title')).toBe('-title')
    expect(toggleSortKey('-title', 'title')).toBe('title')
    expect(toggleSortKey('title', 'risk_score')).toBe('-risk_score')
    expect(toggleSortKey('-created_at', 'updated_at')).toBe('-updated_at')
  })
})
