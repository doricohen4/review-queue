import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSearchCommit, SEARCH_DEBOUNCE_MS } from './searchInput'

describe('createSearchCommit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the latest query once, after typing pauses', () => {
    vi.useFakeTimers()
    const committed: string[] = []
    const search = createSearchCommit(SEARCH_DEBOUNCE_MS, (value) => {
      committed.push(value)
    })

    search.push('m')
    search.push('ma')
    search.push('math')
    expect(committed).toEqual([])

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    expect(committed).toEqual([])

    vi.advanceTimersByTime(1)
    expect(committed).toEqual(['math'])
  })

  it('drops a query that was cancelled before the pause ended', () => {
    vi.useFakeTimers()
    const committed: string[] = []
    const search = createSearchCommit(SEARCH_DEBOUNCE_MS, (value) => {
      committed.push(value)
    })

    search.push('math')
    search.cancel()
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
    expect(committed).toEqual([])
  })
})
