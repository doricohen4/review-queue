import { describe, expect, it } from 'vitest'
import {
  FILTER_EMPTY,
  isAllFiltersSelected,
  parseQueryState,
  selectedFilterSet,
  serializeQueryState,
  splitFilterValues,
  toggleAllFilterValues,
  summarizeNamedFilters,
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
    expect(toggleAllFilterValues('', all)).toBe(FILTER_EMPTY)
    expect(isAllFiltersSelected(FILTER_EMPTY, all)).toBe(false)
    expect(selectedFilterSet(FILTER_EMPTY, all)).toEqual([])
    expect(toggleAllFilterValues(FILTER_EMPTY, all)).toBe('')
    expect(toggleFilterValue('', 'pending', all)).toBe('approved,needs_work')
    expect(toggleFilterValue(FILTER_EMPTY, 'pending', all)).toBe('pending')
  })

  it('caps named submitter chips at three and reports the rest as +N', () => {
    const options = [
      { value: '1', label: 'Alice Johnson' },
      { value: '2', label: 'Bob Smith' },
      { value: '3', label: 'Carol Williams' },
      { value: '4', label: 'Dana Cole' },
      { value: '5', label: 'Elena Park' },
    ]
    expect(summarizeNamedFilters('1,2', options)).toEqual({
      named: [
        { value: '1', label: 'Alice Johnson' },
        { value: '2', label: 'Bob Smith' },
      ],
      extra: 0,
    })
    expect(summarizeNamedFilters('1,2,3,4,5', options)).toEqual({
      named: [
        { value: '1', label: 'Alice Johnson' },
        { value: '2', label: 'Bob Smith' },
        { value: '3', label: 'Carol Williams' },
      ],
      extra: 2,
    })
  })

  it('toggles a column between asc and desc sort keys', () => {
    expect(toggleSortKey('-created_at', 'title')).toBe('title')
    expect(toggleSortKey('title', 'title')).toBe('-title')
    expect(toggleSortKey('-title', 'title')).toBe('title')
    expect(toggleSortKey('title', 'risk_score')).toBe('-risk_score')
    expect(toggleSortKey('-created_at', 'updated_at')).toBe('-updated_at')
  })
})
