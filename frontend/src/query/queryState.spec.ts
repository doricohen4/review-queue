import { describe, expect, it } from 'vitest'
import { parseQueryState, serializeQueryState } from './queryState'

describe('queryState', () => {
  it('parses q and filter[status] from the search string', () => {
    const state = parseQueryState('q=math&filter[status]=pending')

    expect(state.q).toBe('math')
    expect(state.filters.status).toBe('pending')
    expect(state.panel).toBeNull()
  })

  it('serializes q and filter[status] back onto the query string', () => {
    const search = serializeQueryState({
      q: 'math',
      filters: { status: 'pending' },
      sort: '-created_at',
      page: 1,
      perPage: 15,
      panel: null,
    })

    const params = new URLSearchParams(search)
    expect(params.get('q')).toBe('math')
    expect(params.get('filter[status]')).toBe('pending')
  })

  it('round-trips panel as a UI-only param', () => {
    const search = serializeQueryState({
      q: '',
      filters: {},
      sort: '-created_at',
      page: 1,
      perPage: 15,
      panel: '12',
    })

    expect(new URLSearchParams(search).get('panel')).toBe('12')
    expect(parseQueryState(search).panel).toBe('12')
  })
})
