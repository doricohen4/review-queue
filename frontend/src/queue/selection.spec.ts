import { describe, expect, it } from 'vitest'
import { clearSelection, pageAllSelected, togglePageSelection, toggleSelectedId } from './selection'

describe('queue selection', () => {
  it('toggles one id on and off', () => {
    expect(toggleSelectedId([1], 2)).toEqual([1, 2])
    expect(toggleSelectedId([1, 2], 1)).toEqual([2])
  })

  it('selects the current page without dropping ids from other pages', () => {
    expect(pageAllSelected([1, 2], [1, 2, 9])).toBe(true)
    expect(togglePageSelection([9], [1, 2], false)).toEqual([9, 1, 2])
    expect(togglePageSelection([9, 1, 2], [1, 2], true)).toEqual([9])
  })

  it('clears the set', () => {
    expect(clearSelection()).toEqual([])
  })
})
